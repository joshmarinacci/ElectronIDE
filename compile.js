/*
use this as a guide:
    http://arduino.cc/en/Hacking/BuildProcess
 */


var fs = require('fs');
var sh = require('execSync');
var LIBRARIES = require('./libraries').loadLibraries();

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};


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

}


function calculateLibs(list, paths, libs, debug) {
    //install libs if needed, and add to the include paths
    list.forEach(function(libname){
        if(libname == 'Arduino') return; //already included, skip it
        debug('looking at lib',libname);
        var lib = LIBRARIES.getById(libname.toLowerCase());
        if(!lib) {
            debug("ERROR. couldn't find library",libname);
            return;
        }
        if(!lib.isInstalled()) {
            debug("not installed yet. we must install it");
            lib.install(function(){
                debug(libname+' installed now');
            });
        } else {
            debug(libname + " already installed");
        }
        debug("include path = ",lib.getIncludePath());
        paths.push(lib.getIncludePath());
        libs.push(lib);
        if(lib.dependencies && lib.dependencies.length) {
            calculateLibs(lib.dependencies, paths, libs, debug);
        }
    });
}

function listdir(path) {
    return fs.readdirSync(path).map(function(file) {
        return path+'/'+file;
    });
}


function exec(cmd, cb) {
    //console.log(cmd.join(' '));
    var result = sh.exec(cmd.join(' '));
    if(result.code != 0) {
        //debug("there was a problem running",cmd,result);
        var err = new Error("there was a problem running " + cmd.join(" "));
        err.cmd = cmd;
        err.output = result.stdout;
        throw err;
    }
    if(cb) cb();
}

function linkFile(options, file, outdir) {
    var cmd = [
        options.platform.getCompilerBinaryPath()+'/avr-ar',
        'rcs',
        outdir+'/core.a',
        file,
    ];
    exec(cmd,function() { console.log('linked'); });
}

function linkElfFile(options, outdir) {

    //link everything into the .elf file
    var elfcmd = [
        options.platform.getCompilerBinaryPath()+'/avr-gcc', //gcc
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

    exec(elfcmd, function() { console.log("elfed"); });
}

function extractEEPROMData(options, outdir) {
    var eepcmd = [
        options.platform.getCompilerBinaryPath()+'/avr-objcopy',
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

    exec(eepcmd, function() { console.log("eed");});
}

function buildHexFile(options, outdir) {
    var hexcmd = [
        options.platform.getCompilerBinaryPath()+'/avr-objcopy',
        '-O',
        'ihex',
        '-R',
        '.eeprom',
        outdir+'/'+options.name+'.elf',
        outdir+'/'+options.name+'.hex',
    ];
    exec(hexcmd, function() { console.log("hexed"); });
}

exports.compile = function(sketchPath, outdir,options, publish, sketchDir) {

    function debug(message) {
        var args = Array.prototype.slice.call(arguments);
        console.log(args.join(' '));
        publish({type:"compile", message:args.join(" ")});
    }

    debug("compiling ",sketchPath,"to dir",outdir);
    debug("root sketch dir = ",sketchDir);

    var tmp = "build/tmp";

    debug("assembling the sketch in the directory",tmp);
    checkfile(tmp);

    var cfile = tmp+'/'+options.name+'.cpp';

    debug("generating",cfile);
    generateCPPFile(cfile,sketchPath);
    //copy other sketch files over
    var cfiles = [cfile];
    //compile sketch files
    function copyToDir(file, indir, outdir) {
        var text = fs.readFileSync(indir+'/'+file);
        fs.writeFileSync(outdir+'/'+file,text);
    }
    fs.readdirSync(sketchDir).forEach(function(file) {
        if(file.toLowerCase().endsWith('.h')) copyToDir(file,sketchDir,tmp);
        if(file.toLowerCase().endsWith('.cpp')) copyToDir(file,sketchDir,tmp);
        cfiles.push(tmp+'/'+file);
    });




    var includedLibs = detectLibs(fs.readFileSync(cfile).toString());
    debug('scanned for included libs',includedLibs);

    //assemble library paths
    var librarypaths = [];
    var libextra = [];
    var plat = options.platform;
    //global libs
    debug("arduino libs = ",plat.getStandardLibraryPath());
    fs.readdirSync(plat.getStandardLibraryPath()).forEach(function(lib) {
        librarypaths.push(plat.getStandardLibraryPath()+'/'+lib);
    });

    //TODO userlibs

    //standard global includes for the arduino core itself
    var includepaths = [
        plat.getCorePath(options.device),
        plat.getVariantPath(options.device),
        sketchDir,
    ];
    console.log("include path =",includepaths);
    console.log("includedlibs = ", includedLibs);
    calculateLibs(includedLibs,includepaths,libextra, debug);


    debug("included libs = ", includedLibs);
    debug("included path = ", includepaths);
    debug("included 3rd party libs objects",libextra);

    compileFiles(options,outdir,includepaths,cfiles,debug);

    libextra.forEach(function(lib) {
        if(lib.id == 'wire') return;
        var path = lib.getIncludePath();
        var cfiles = listdir(path);
        compileFiles(options, outdir, includepaths, cfiles, debug);
    })


    //compile core
    var cfiles = listdir(plat.getCorePath(options.device));
    compileFiles(options,outdir,includepaths,cfiles,debug);

    //compile core avr-libc
    var cfiles = listdir(plat.getCorePath(options.device)+'/avr-libc');
    compileFiles(options,outdir,includepaths,cfiles,debug);


    //link everything into core.a
    listdir(outdir)
        .filter(function(file){
            if(file.endsWith('.d')) return false;
            return true;
        })
        .forEach(function(file) {
            debug("linking",file);
            linkFile(options,file,outdir);
        });

    debug("building elf file");
    linkElfFile(options,outdir);


    // 5. extract EEPROM data (from EEMEM directive) to .eep file.
    debug("extracting EEPROM data");
    extractEEPROMData(options,outdir);


    // 6. build the .hex file
    debug("building .HEX file");
    buildHexFile(options,outdir);
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
        if(file.toLowerCase().endsWith('examples')) return;
        debug("still need to compile",file);
        //throw new Error("couldn't compile file: "+file);
    })
}

function compileCPP(options, outdir, includepaths, cfile,debug) {
    debug("compiling ",cfile);//,"to",outdir,"with options",options);
    //console.log("include files = ",includepaths);
    //console.log("options = ",options);

    var cmd = [
        options.platform.getCompilerBinaryPath(options.device)+"/avr-g++",
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
    debug(cmd.join(' '));

    exec(cmd, function() { console.log("compiled c"); });
}

function compileC(options, outdir, includepaths, cfile, debug) {
    debug("compiling ",cfile);//,"to",outdir,"with options",options);
    var cmd = [
    options.platform.getCompilerBinaryPath(options.device)+"/avr-gcc", //gcc
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

    exec(cmd, function() { console.log("compiled c"); });
}
