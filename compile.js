var fs = require('fs');
//var child = require('child_process');
var sh = require('execSync');
var libs = require('./libraries').loadLibraries();

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

    /*

    package
    verify
    compile
    download

    prereqs:
        sketch directory
        list of files to include or exclude
        desired temp dirs
        desired output dir for the hex file
        name of the hex file
        location of the compiler
        location of standard include files
        name of the board
        location of board specific include files


    use this as a guide:
        http://arduino.cc/en/Hacking/BuildProcess



    assemble:
        concat all .ino files
        include #include "WProgram.h"

        create decs for all functions. put before code but after #defines and #includes
        append target board's main.cxx

        set some vars based on the current board ?

    compile:
        invoke avr-gcc with proper include dirs
            build .c .cpp files
            link .o into static lib
            generate .hex file


    upload:



     */

function checkfile(path) {
    if(!fs.existsSync(path)) throw new Error("file not found " + path);
}

function detectLibs(code) {
    var libs = [];
    var lines = code.split('\n');
    lines.forEach(function(line){
        var re = /\s*#include\s*[<"](\w+)\.h[>"]/i;
        var res = line.match(re);
        if(res) libs.push(res[1]);
    });
    return libs;
}

var FUNCTION_DEFINITION_REGEX =  /(void)\s+(\w+)\((.*)\)/;

function generateDecs(code) {
    var decs = [];
    code.split('\n').forEach(function(line) {
        var def = line.match(FUNCTION_DEFINITION_REGEX);
        if(def) {
            var dec = def[1]+' '+def[2]+'('+def[3]+');\n';
            decs.push(dec);
        }
    });
    return decs;
}

function generateCPPFile(cfile,sketchPath) {
    //write the standard header
    fs.writeFileSync(cfile,'#include "Arduino.h"\n');

    var funcdecs = [];
    var codes = [];

    //loop through all sketch files
    fs.readdirSync(sketchPath).forEach(function(file){
        if(file.toLowerCase().endsWith('.ino')) {
            var code = fs.readFileSync(sketchPath+'/'+file).toString();
            console.log("code = ");
            generateDecs(code).forEach(function(dec){
                funcdecs.push(dec);
            });
            codes.push(code);
        }
    })

    //insert the generated definitions
    funcdecs.forEach(function(dec){
        fs.appendFileSync(cfile,dec);
    });

    //insert the code chunks
    codes.forEach(function(def){
        fs.appendFileSync(cfile,def);
    })

    //extra newline just in case
    fs.appendFileSync(cfile,"\n");
    //console.log("final code = ", fs.readFileSync(cfile).toString());
//    throw new Error('foo');
}



exports.compile = function(sketchPath, outdir,options, publish) {

    function debug(message) {
        var args = Array.prototype.slice.call(arguments);
        console.log(args.join(' '));
        publish({type:"compile", message:args.join(" ")});
    }

    debug("compiling ",sketchPath,"to dir",outdir);

    var tmp = "build/tmp";

    debug("assembling the sketch in the directory",tmp);
    checkfile(tmp);


    options.corepath     = options.hardware +'/arduino/cores/'+options.device.build.core;
    options.variantpath  = options.hardware + '/arduino/variants/'+options.device.build.variant;
    options.arduinolibs = options.root+'/libraries';

    debug("options",options);

    var includepaths = [options.corepath,options.variantpath];
    var cfile = tmp+'/'+options.name+'.cpp';

    debug("generating",cfile);
    generateCPPFile(cfile,sketchPath);




    var includedLibs = detectLibs(fs.readFileSync(cfile).toString());
    debug('scanned for included libs',includedLibs);

    var librarypaths = [];
    var libextra = [];
    //global libs
    debug("arduino libs = ",options.arduinolibs);
    fs.readdirSync(options.arduinolibs).forEach(function(lib) {
        librarypaths.push(options.arduinolibs+'/'+lib);
    });

    //TODO userlibs

    //standard global includes for the arduino core itself
    var includepaths = [
        options.corepath,
        options.variantpath,
    ];


    //install libs if needed, and add to the include paths
    includedLibs.forEach(function(libname){
        if(libname == 'Arduino') return; //already included, skip it
        debug('looking at lib',libname);
        var library = libs.getById(libname.toLowerCase());
        if(!library) {
            debug("ERROR. couldn't find library",libname);
            return;
        }
        if(!library.isInstalled()) {
            debug("not installed yet. we must install it");
            library.install(function(){
                debug(libname+' installed now');
            });
        } else {
            debug(libname + " already installed");
        }
        debug("include path = ",library.getIncludePath());
        includepaths.push(library.getIncludePath());
        libextra.push(library);
    });

    debug("included libs = ", includedLibs);
    debug("included path = ", includepaths);
    debug("included 3rd party libs objects",libextra);

    //compile sketch files
    compileFiles(options,outdir,includepaths,[cfile],debug);


    //TODO compile 3rd party libs
    libextra.forEach(function(lib) {
        if(lib.id == 'wire') return;
        var path = lib.getIncludePath();
        var cfiles = fs.readdirSync(path).map(function(file) {
            return path+'/'+file;
        });
        compileFiles(options, outdir, includepaths, cfiles, debug);
    })


    //compile core
    var cfiles = fs.readdirSync(options.corepath).map(function(file) {
        return options.corepath+'/'+file;
    });
    compileFiles(options,outdir,includepaths,cfiles,debug);

    //compile core avr-libc
    var cfiles = fs.readdirSync(options.corepath+'/avr-libc').map(function(file) {
        return options.corepath+'/avr-libc/'+file;
    });
    compileFiles(options,outdir,includepaths,cfiles,debug);


    //link everything into core.a
    fs.readdirSync(outdir).forEach(function(file) {
        if(file.endsWith('.d')) return;
        debug("linking",file);
        var cmd = [
            options.avrbase+'/avr-ar',
            'rcs',
            outdir+'/core.a',
            outdir+'/'+file,
        ];
        //debug("execing",cmd.join(' '));
        var result = sh.exec(cmd.join(' '));
        if(result.code != 0) {
            debug("there was a problem running",cmd,result);
            throw new Error("there was a problem running " + cmd.join(" "));
        }
    });

    //link everything into the .elf file
    var elfcmd = [
        options.avrbase+'/avr-gcc', //gcc
        '-Os', //??
        '-Wl,--gc-sections', //not using relax yet
        '-mmcu='+options.device.build.mcu, //the mcu, ex: atmega168
        '-o', //??
        outdir+'/'+options.name+'.elf',
        outdir+'/'+options.name+'.o',
        outdir+'/core.a',
        '-L'+__dirname+'/'+outdir,
        '-lm',
    ];

    debug("building elf file");
    debug(elfcmd.join(' '));
    var result = sh.exec(elfcmd.join(' '));
    //console.log("elf output = ",result.stdout);
    if(result.code != 0) {
        debug("stdout = ",result.stdout);
        var err = new Error("there was an error compiling");
        err.output = result.stdout;
        throw err;
    }





    // 5. extract EEPROM data (from EEMEM directive) to .eep file.
    debug("extracting EEPROM data");
    var eepcmd = [
        options.avrbase+'/avr-objcopy',
        '-O',
        'ihex',
        '-j',
        '.eeprom',
        '--set-section-flags=.eeprom=alloc,load',
        '--no-change-warnings',
        '--change-section-lma',
        '.eeprom=0',
        outdir+'/'+options.name+'.elf',
        outdir+'/'+options.name+'.eep',
    ];

    debug('extracting EEPROM data to .eep file');
    debug(eepcmd.join(' '));
    var result = sh.exec(eepcmd.join(' '));
    //console.log("output = ",result);


    // 6. build the .hex file
    debug("building .HEX file");
    var hexcmd = [
        options.avrbase+'/avr-objcopy',
        '-O',
        'ihex',
        '-R',
        '.eeprom',
        outdir+'/'+options.name+'.elf',
        outdir+'/'+options.name+'.hex',
    ];
    debug('building hex file');
    debug(hexcmd.join(' '));
    var result = sh.exec(hexcmd.join(' '));
}

function compileFiles(options, outdir, includepaths, cfiles,debug) {
    cfiles.forEach(function(file) {
        //console.log("looking at file",file);
        if(file.toLowerCase().endsWith('.c')) {
            compileC(options,outdir, includepaths, file,debug);
            return;
        }
        if(file.toLowerCase().endsWith('.cpp')) {
            compileCPP(options,outdir, includepaths, file,debug);
            return;
        }
        if(file.toLowerCase().endsWith('.txt')) return;
        if(file.toLowerCase().endsWith('.md')) return;
        if(file.toLowerCase().endsWith('.h')) return;
        if(file.toLowerCase().endsWith('/avr-libc')) return;
        debug("still need to compile",file);
        //throw new Error("couldn't compile file: "+file);
    })
}

function compileCPP(options, outdir, includepaths, cfile,debug) {
    debug("compiling ",cfile);//,"to",outdir,"with options",options);
    //console.log("include files = ",includepaths);
    //console.log("options = ",options);

    var cmd = [
        options.avrbase+"/avr-g++",
        "-c", //compile, don't link
        '-g', //include debug info and line numbers
        '-Os', //optimize for size
        '-Wall', //turn on verbose warnings
        '-fno-exceptions',// ??
        '-ffunction-sections',// put each function in it's own section
        '-fdata-sections', //??
        '-mmcu='+options.device.build.mcu,
        '-DF_CPU='+options.device.build.f_cpu,
        '-MMD',//output dependency info
        '-DARDUINO=105', //??
        '-DUSB_VID='+options.device.build.vid, //??
        '-DUSB_PID='+options.device.build.pid, //??
    ];

    includepaths.forEach(function(path){
        cmd.push("-I"+path);
    })

    cmd.push(cfile); //add the actual c++ file
    cmd.push('-o'); //output object file
    var filename = cfile.substring(cfile.lastIndexOf('/')+1);
    var shortname = filename.substring(0,filename.lastIndexOf('.'));
    cmd.push(outdir+'/'+shortname+'.o');
    //debug(cmd.join(' '));
    var result = sh.exec(cmd.join(' '));
    if(result.code != 0) {
        debug("stdout = ",result.stdout);
        var err = new Error("there was an error compiling");
        err.output = result.stdout;
        throw err;
    }
}

function compileC(options, outdir, includepaths, cfile, debug) {
    debug("compiling ",cfile);//,"to",outdir,"with options",options);
    var cmd = [
        options.avrbase+'/avr-gcc', //gcc
        "-c", //compile, don't link
        '-g', //include debug info and line numbers
        '-Os', //optimize for size
        '-Wall', //turn on verbose warnings
        '-ffunction-sections',// put each function in it's own section
        '-fdata-sections', //??
        '-mmcu='+options.device.build.mcu,
        '-DF_CPU='+options.device.build.f_cpu,
        '-MMD',//output dependency info
        '-DARDUINO=105', //??
        '-DUSB_VID='+options.device.vid, //??
        '-DUSB_PID='+options.device.pid, //??
    ];
    includepaths.forEach(function(path){
        cmd.push("-I"+path);
    })
    cmd.push(cfile); //add the actual c file
    cmd.push('-o');
    var filename = cfile.substring(cfile.lastIndexOf('/')+1);
    var shortname = filename.substring(0,filename.lastIndexOf('.'));
    cmd.push(outdir+'/'+shortname+'.o');

    //debug('running',cmd.join(' '));
    var result = sh.exec(cmd.join(' '));
    //debug("result = ",result.code);
    if(result.code != 0) {
        debug("stdout = ",result.stdout);
        var err = new Error("there was an error compiling");
        err.output = result.stdout;
        throw err;
    }
}
