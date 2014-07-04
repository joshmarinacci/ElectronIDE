/*
use this as a guide:
    http://arduino.cc/en/Hacking/BuildProcess
 */


var fs = require('fs');
var async = require('async');
var wrench = require('wrench');
var child_process = require('child_process');
var LIBRARIES = require('./libraries');

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};
String.prototype.startsWith = function(suffix) {
    return this.indexOf(suffix) == 0;
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

var FUNCTION_DEFINITION_REGEX =  /(unsigned )*\s*(void|short|long|char|int)\s+(\w+)\((.*)\)/;

function generateDecs(code) {
    var decs = [];
    code.split('\n').forEach(function(line) {
        var def = line.match(FUNCTION_DEFINITION_REGEX);
        if(def) {
            var dec = def[1]+' '+def[2]+'('+def[3]+');\n';
            decs.push(def[0]+';\n');
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

}


function calculateLibs(list, paths, libs, debug, cb, plat) {
    LIBRARIES.install(list,function() {
        //install libs if needed, and add to the include paths
        list.forEach(function(libname){
            if(libname == 'Arduino') return; //already included, skip it
            debug('scanning lib',libname);
            if(LIBRARIES.isUserLib(libname,plat)) {
                console.log("it's a user lib");
                var lib = LIBRARIES.getUserLib(libname,plat);
                lib.getIncludePaths(plat).forEach(function(path) {
                    paths.push(path);
                });
                libs.push(lib);
                return;
            }

            var lib = LIBRARIES.getById(libname.toLowerCase());
            if(!lib) {
                debug("ERROR. couldn't find library",libname);
                return;
            }
            if(!lib.isInstalled()) {
                debug("not installed yet. we must install it");
                throw new Error("library should alredy be installed! " + libname);
            }
            debug("include path = ",lib.getIncludePaths(plat));
            lib.getIncludePaths(plat).forEach(function(path) { paths.push(path); });
            libs.push(lib);
            if(lib.dependencies) {
                console.log("deps = ",lib.dependencies);
                lib.dependencies.map(function(libname) {
                    return LIBRARIES.getById(libname);
                }).map(function(lib){
                    console.log("looking at lib",lib);
                    debug("include path = ",lib.getIncludePaths(plat));
                    lib.getIncludePaths(plat).forEach(function(path) { paths.push(path); });
                    libs.push(lib);
                })
            }
        });

        cb();
    });
}

function listdir(path) {
    return fs.readdirSync(path)
    .filter(function(file) {
        if(file.startsWith('.')) return false;
        return true;
    })
    .map(function(file) {
        return path+'/'+file;
    });
}


function exec(cmd, cb, debug) {
    var result = child_process.execFile(
        cmd[0],
        cmd.slice(1),
        function(error, stdout, stderr) {
        if(error) {
            console.log(error);
            console.log("code = ",error.code);
            console.log(cmd.join(" "));
            console.log(stdout);
            console.log(stderr);
            var err = new Error("there was a problem running " + cmd.join(" "));
            err.cmd = cmd;
            err.output = stdout + stderr;
            if(debug) debug(err);
        }
        if(cb) cb();
    });
}

function linkFile(options, file, outdir, cb, debug) {
    var cmd = [
        options.platform.getCompilerBinaryPath()+'/avr-ar',
        'rcs',
        outdir+'/core.a',
        file,
    ];
    exec(cmd, cb, debug);
}

function linkElfFile(options, libofiles, outdir, cb, debug) {

    //link everything into the .elf file
    var elfcmd = [
        options.platform.getCompilerBinaryPath()+'/avr-gcc', //gcc
        '-Os', //??
        '-Wl,--gc-sections', //not using relax yet
        '-mmcu='+options.device.build.mcu, //the mcu, ex: atmega168
        '-o', //??
        outdir+'/'+options.name+'.cpp.elf',
        outdir+'/'+options.name+'.cpp.o',
    ];

    elfcmd = elfcmd.concat(libofiles);
    elfcmd = elfcmd.concat([
        outdir+'/core.a',
        '-L'+__dirname+'/'+outdir,
        '-lm',
    ]);


    exec(elfcmd, cb, debug);
}

function extractEEPROMData(options, outdir, cb, debug) {
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
        outdir+'/'+options.name+'.cpp.elf',
        outdir+'/'+options.name+'.eep',
    ];

    exec(eepcmd, cb, debug);
}

function buildHexFile(options, outdir, cb, debug) {
    var hexcmd = [
        options.platform.getCompilerBinaryPath()+'/avr-objcopy',
        '-O',
        'ihex',
        '-R',
        '.eeprom',
        outdir+'/'+options.name+'.cpp.elf',
        outdir+'/'+options.name+'.hex',
    ];
    exec(hexcmd, cb, debug);
}

function processList(list, cb, publish) {
    if(list.length <= 0) {
        cb();
        return;
    }
    var item = list.shift();
    try {
        item(function() {
            console.log("--------------------");
            processList(list,cb, publish);
        });
    } catch(err) {
        console.log("there was an error");
        console.log(err.toString());
        console.log("publish = ", publish);
        publish({
            type:'error',
            message:err.toString(),
            path:err.path,
            errno: err.errno,
            code: err.code,
        });
    }
}

exports.compile = function(sketchPath, outdir,options, publish, sketchDir, finalcb) {
    var errorHit = false;
    function debug(message) {
        var args = Array.prototype.slice.call(arguments);
        if(message instanceof Error) {
            errorHit = true;
            publish({type:'error', message: args.join(" ") + message.output});
        } else {
            publish({type:"compile", message:args.join(" ")});
        }
    }

    checkfile(options.platform.getCompilerBinaryPath());

    debug("compiling ",sketchPath,"to dir",outdir);
    debug("root sketch dir = ",sketchDir);

    var tmp = "build/tmp";
    wrench.rmdirSyncRecursive(outdir, true);
    wrench.mkdirSyncRecursive(tmp);
    wrench.mkdirSyncRecursive(outdir);




    debug("assembling the sketch in the directory",tmp);
    checkfile(tmp);


    var tasks = [];

    var cfile = tmp+'/'+options.name+'.cpp';
    var cfiles = [];
    var includepaths = [];
    var libextra = [];
    var plat = options.platform;

    //generate the CPP file and copy all files to the output directory
    tasks.push(function(cb) {
        debug("generating",cfile);
        generateCPPFile(cfile,sketchPath);

        cfiles.push(cfile);
        //compile sketch files
        function copyToDir(file, indir, outdir) {
            console.log("copying ",file);
            var text = fs.readFileSync(indir+'/'+file);
            fs.writeFileSync(outdir+'/'+file,text);
        }
        fs.readdirSync(sketchDir).forEach(function(file) {
            if(file.toLowerCase().endsWith('.h')) copyToDir(file,sketchDir,tmp);
            if(file.toLowerCase().endsWith('.cpp')) copyToDir(file,sketchDir,tmp);
            cfiles.push(tmp+'/'+file);
        });
        cb();
    });

    // scan for the included libs
    // make sure they are all installed
    // collect their include paths
    tasks.push(function(cb) {

        var includedLibs = detectLibs(fs.readFileSync(cfile).toString());
        debug('scanned for included libs',includedLibs);

        //assemble library paths
        var librarypaths = [];
        //global libs
        debug("standard arduino libs = ",plat.getStandardLibraryPath());
        fs.readdirSync(plat.getStandardLibraryPath()).forEach(function(lib) {
            librarypaths.push(plat.getStandardLibraryPath()+'/'+lib);
        });

        //userlibs
        listdir(plat.getUserLibraryDir()).forEach(function(lib) {
            librarypaths.push(lib);
        });

        //standard global includes for the arduino core itself
        includepaths.push(plat.getCorePath(options.device));
        includepaths.push(plat.getVariantPath(options.device));
        includepaths.push(sketchDir);

        console.log("include path =",includepaths);
        console.log("includedlibs = ", includedLibs);
        calculateLibs(includedLibs,includepaths,libextra, debug, cb, plat);
    });

    //actually compile code
    tasks.push(function(cb) {
        console.log("moving on now");
        //debug("included libs = ", includedLibs);
        debug("include paths = ", includepaths);
        debug("using 3rd party libraries",libextra.map(function(lib) { return lib.id }).join(', '));
        compileFiles(options,outdir,includepaths,cfiles,debug, cb);
    });

    //compile the 3rd party libs
    tasks.push(function(cb) {
        debug("compiling 3rd party libs");
        async.map(libextra, function(lib,cb) {
            debug('compiling library: ',lib.id);
            var paths = lib.getIncludePaths(plat);
            var cfiles = [];
            paths.forEach(function(path) {
                wrench.readdirSyncRecursive(path)
                    .filter(function(filename) {
                        if(filename.startsWith('examples/')) return false;
                        if(filename.toLowerCase().endsWith('.c')) return true;
                        if(filename.toLowerCase().endsWith('.cpp')) return true;
                        return false;
                    })
                    .forEach(function(filename) {
                        cfiles.push(path+'/'+filename);
                    })
                ;
            });
            compileFiles(options, outdir, includepaths, cfiles, debug,cb);
        },cb);
    });

    //compile core
    tasks.push(function(cb) {
        debug("compiling core files");
        var cfiles = listdir(plat.getCorePath(options.device));
        compileFiles(options,outdir,includepaths,cfiles,debug,cb);
    });

    //compile core avr-libc
    tasks.push(function(cb) {
        var libcdir = plat.getCorePath(options.device)+'/avr-libc';
        if(fs.existsSync(libcdir)) {
            var cfiles = listdir(plat.getCorePath(options.device)+'/avr-libc');
            compileFiles(options,outdir,includepaths,cfiles,debug,cb);
        } else {
            if(cb) cb();
        }
    });

    //link everything into core.a
    tasks.push(function(cb) {
        var dfiles = listdir(outdir)
            .filter(function(file){
                if(file.endsWith('.d')) return false;
                return true;
            });
        async.mapSeries(dfiles, function(file, cb) {
                debug("linking",file);
                linkFile(options,file,outdir, cb, debug);
            }, cb);
        });

    //build the elf file
    tasks.push(function(cb) {
        debug("building elf file");
        var libofiles = [];
        libextra.forEach(function(lib) {
            var paths = lib.getIncludePaths(plat);
            paths.forEach(function(path) {
                listdir(path).filter(function(file) {
                    if(file.endsWith('.cpp')) return true;
                    return false;
                }).map(function(filename) {
                    libofiles.push('build/out/'+filename.substring(filename.lastIndexOf('/')+1) + '.o');
                });
            });
        });

        linkElfFile(options,libofiles,outdir,cb, debug);
    });


    // 5. extract EEPROM data (from EEMEM directive) to .eep file.
    tasks.push(function(cb) {
        debug("extracting EEPROM data");
        extractEEPROMData(options,outdir,cb,debug);
    });


    // 6. build the .hex file
    tasks.push(function(cb) {
        debug("building .HEX file");
        buildHexFile(options,outdir,cb, debug);
    });
    processList(tasks, function() {
        if(errorHit) {
            var err = new Error("ERROR DURING COMPILE! STOP!");
            finalcb(err);
        } else {
            finalcb(null);
        }
    }, publish);
}

function compileFiles(options, outdir, includepaths, cfiles,debug, cb) {
    function comp(file,cb) {
        var fname = file.substring(file.lastIndexOf('/')+1);
        if(fname.startsWith('.')) return cb(null, null);
        if(file.toLowerCase().endsWith('examples')) return cb(null,null);
        if(file.toLowerCase().endsWith('/avr-libc')) return cb(null,null);
        if(file.toLowerCase().endsWith('.c')) {
            compileC(options,outdir, includepaths, file,debug, cb);
            return;
        }
        if(file.toLowerCase().endsWith('.cpp')) {
            compileCPP(options,outdir, includepaths, file,debug, cb);
            return;
        }
        //debug("still need to compile",file);
        cb(null,null);
    }

    async.mapSeries(cfiles, comp, cb);
}

function compileCPP(options, outdir, includepaths, cfile,debug, cb) {
    debug("compiling ",cfile);

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
    cmd.push(outdir+'/'+filename+'.o');

    exec(cmd,cb, debug);
}

function compileC(options, outdir, includepaths, cfile, debug, cb) {
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
    cmd.push(outdir+'/'+filename+'.o');

    exec(cmd, cb, debug);
}
