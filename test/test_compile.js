var fs = require('fs');
var os = require('os');

var boards = require('../boards');
var platform = require('../platform');
var compile = require('../compile');
var wrench = require('wrench');
var libraries = require('../libraries');
var async = require('async');
var child_process = require('child_process');
var Q = require('q');


function errorIfMissing(file) {
    console.log("checking",file);
    if(!fs.existsSync(file)) throw new Error("file not found " + file);
}

function cleanDir(outdir){
    console.log("cleaning",outdir);
    wrench.rmdirSyncRecursive(outdir, true);
    wrench.mkdirSyncRecursive(outdir);
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



function installPlatform_P(options) {
    return options.platform.installIfNeeded_P();
}
function cleanDirs_P(options) {
    return Q.fcall(function() {
        console.log("cleaning the dirs",options.sketchOutDir);
        wrench.rmdirSyncRecursive(options.sketchOutDir, true);
        wrench.mkdirSyncRecursive(options.sketchOutDir);
    });
}

function generateCPPFile_P(options) {
    return Q.fcall(function() {
        var cfile = options.sketchCPPFile;
        console.log("generating CPP file ", cfile);
        fs.writeFileSync(cfile, '#include "Arduino.h"\n');
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
    });
}

function copyAllFilesMatching_P(exts, srcDir, destDir) {
    return Q.fcall(function() {
        console.log("copying files for extensions",exts);
        var cfiles = [];
        //compile sketch files
        function copyToDir(file, indir, outdir) {
            console.log("copying ",file);
            var text = fs.readFileSync(indir+'/'+file);
            fs.writeFileSync(outdir+'/'+file,text);
        }
        fs.readdirSync(srcDir).forEach(function(file) {
            if(file.toLowerCase().endsWith('.h')) copyToDir(file,srcDir,destDir);
            if(file.toLowerCase().endsWith('.cpp')) copyToDir(file,srcDir,destDir);
            cfiles.push(sketchPath+'/'+file);
        });
        return cfiles;
    });
}

function scanIncludes_P(options) {
    return Q.fcall(function() {
        console.log("scanning for includes", options.sketchCPPFile);
        var code = fs.readFileSync(options.sketchCPPFile).toString();
        var libs = [];
        var lines = code.split('\n');
        lines.forEach(function(line){
            var re = /\s*#include\s*[<"](\w+)\.h[>"]/i;
            var res = line.match(re);
            if(res) libs.push(res[1]);
        });
        console.log('========= scanned for included libs',libs);
        options.includedLibs = libs;
    })
}

function stripHiddenFilter(str) {
    return str.lastIndexOf('/.') < 0;
}

function listdir(path) {
    return fs.readdirSync(path).map(function(file) {
        return path + '/' + file;
    })
}

function collectLibraries_P(options) {
    return Q.fcall(function() {
        console.log("collecting libraries",options.includedLibs);
        var std_paths = listdir(options.platform.getStandardLibraryPath()).filter(stripHiddenFilter);
        var user_paths = listdir(options.platform.getUserLibraryDir()).filter(stripHiddenFilter);
        var paths = std_paths.concat(user_paths);
        paths.push(options.platform.getCorePath());
        paths.push(options.platform.getVariantPath());
        paths.push(options.sketchDir);
        options.includePaths = paths;
        //console.log("include paths =",options.includePaths);
    });
}

/*
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
                throw new Error("Missing Library! " + libname);
            }
            if(!lib.isInstalled()) {
                throw new Error("library should already be installed! " + libname);
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
*/

function collectDependencies(lib) {
    if(!lib.dependencies) return [];
    return lib.dependencies.map(libraries.getById)
        .filter(function(lib) { return lib && !lib.isInstalled() });
}

function installLibraries_P(options) {
    return Q.Promise(function(resolve,reject,notify) {
        console.log("installing libraries", options.includedLibs);
        var toInstall = options.includedLibs
                .map(libraries.getById)
                .filter(function (lib) { return lib && !lib.isInstalled() })
            ;
        var subdeps = [];
        toInstall.forEach(function(lib){
            subdeps = subdeps.concat(collectDependencies(lib));
        });
        toInstall = toInstall.concat(subdeps);
        console.log("final list to install", toInstall);
        var proms = toInstall.map(function (lib) {
            return lib.install_P().then(function() {
                notify({message:"installed " +lib.id});
            });
        });

        Q.allSettled(proms).then(resolve,reject,notify).done();
    });
}
function compileSketch_P(options) {
    return Q.fcall(function() {
        console.log("compiling sketch");
        console.log("include paths = ", JSON.stringify(options.includePaths,null, '   '));
        var cfiles = [options.sketchCPPFile];
        return Q.all(cfiles.map(function(file) {
            if(file.toLowerCase().endsWith('.cpp')) {
                return compileCPP(options,file);
            }
        }));
    });
}
function compileLibs_P(options) {
    return Q.fcall(function() {
        console.log("compiling libs");
    });
}
function compileArduinoCore_P(options) {
    return Q.fcall(function() {
        console.log("compiling arduino core");
    });
}
function compileLibC_P(options) {
    return Q.fcall(function() {
        console.log("compiling lib c");
    });
}
function linkAll_P(options) {
    return Q.fcall(function() {
        console.log("linking all");
    });
}
function buildElf_P(options) {
    return Q.fcall(function() {
        console.log("building elf lib");
    });
}
function extractEEPROM_P(options) {
    return Q.fcall(function() {
        console.log("extracting the EEPROM");
    });
}
function buildHex_P(options) {
    return Q.fcall(function() {
        console.log("building the hex");
    });
}


var Compiler = {
    buildSketch: function(sketchPath, name, boardId) {
        var OPTIONS = { userlibs: platform.getSettings().userlibs };
        OPTIONS.device =  boards.getBoard(boardId);
        OPTIONS.platform = platform.getPlatform(OPTIONS.device);
        OPTIONS.buildDir = os.tmpdir() + '/build';
        OPTIONS.outDir = OPTIONS.buildDir+'/out';
        OPTIONS.sketchDir = sketchPath;

        OPTIONS.sketchOutDir = OPTIONS.outDir + '/'+sketchPath;
        var options = OPTIONS;
        options.name = name;
        options.sketchCPPFile = options.sketchOutDir +'/' + options.name + '.cpp';
        console.log("compiling sketch = ",options.name);
        console.log("src dir = ",options.sketchDir);
        console.log("build dir = ",options.sketchOutDir);

        return installPlatform_P(options)
            .then(function(){
                return cleanDirs_P(options);
            })
            .then(function() {
                return generateCPPFile_P(options)
            })
            .then(function() {
                return copyAllFilesMatching_P([".h", ".cpp"], options.sketchDir, options.sketchOutDir);
            })
            .then(function() {
                return scanIncludes_P(options);
            })
            .then(function() {
                return collectLibraries_P(options);
            })
            .then(function() {
                return installLibraries_P(options);
            })
            .then(function() {
                return compileSketch_P(options);
            })
            //.then(compileLibs_P(options))
            //.then(compileArduinoCore_P(options))
            //.then(compileLibC_P(options))
            //.then(linkAll_P(options))
            //.then(buildElf_P(options))
            //.then(extractEEPROM_P(options))
            //.then(buildHex_P(options))
        ;
    }
};

var sketchPath = 'test/examples/NESTest/';
Compiler.buildSketch(sketchPath,'NESTest', 'uno')
    .then(function(result){
        console.log("done with the result");
    }, function(e) {

        console.log('error', e, e.stack)
    }, function(d) {
        console.log("DEBUG:",d);
    })
    .done();













function compileFiles(options, outdir, includepaths, cfiles,debug, cb) {
    function comp(file,cb) {
        console.log('invoking',file);
        var fname = file.substring(file.lastIndexOf('/')+1);
        if(fname.startsWith('.')) return cb(null, null);
        if(file.toLowerCase().endsWith('examples')) return cb(null,null);
        if(file.toLowerCase().endsWith('/avr-libc')) return cb(null,null);
        if(file.toLowerCase().endsWith('.c')) {
            compileC(options,outdir, includepaths, file,debug, cb);
            return;
        }
        if(file.toLowerCase().endsWith('.cpp')) {
            compileCPP(options, file,debug, cb).done();
            return;
        }
        //debug("still need to compile",file);
        cb(null,null);
    }

    async.mapSeries(cfiles, comp, cb);
}
exports.compileFiles = compileFiles;

function compileCPP(options, file) {
    //console.log("compiling ",file);
    return Q.promise(function(resolve,reject,notify){
        var cmd = [
            options.platform.getCompilerBinaryPath()+"/avr-g++",
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

        options.includePaths.forEach(function(path){
            cmd.push("-I"+path);
        });

        cmd.push(file); //add the actual c++ file
        cmd.push('-o'); //output object file
        cmd.push(options.outDir+'/'+options.name+'.o');

        child_process.execFile(
            cmd[0],
            cmd.slice(1),
            function(error, stdout, stderr) {
                if(stdout) notify({STDOUT:stdout});
                if(stderr) notify({STDERR:stderr});
                if(error) {
                    console.log(error);
                    console.log("code = ",error.code);
                    console.log(cmd.join(" "));
                    console.log(stdout);
                    console.log(stderr);
                    var err = new Error("there was a problem running " + cmd.join(" "));
                    err.cmd = cmd;
                    err.output = stdout + stderr;
                    //if(debug) debug(err);
                    //cb(err);
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });


    //exec(cmd,cb, debug);
}

function compileC(options, outdir, includepaths, cfile, debug, cb) {
    debug("compiling ",cfile);//,"to",outdir,"with options",options);
    var cmd = [
        options.platform.getCompilerBinaryPath()+"/avr-gcc", //gcc
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
function exec(cmd, cb, debug) {
    console.log("invoking command",cmd);
    var result = child_process.execFile(
        cmd[0],
        cmd.slice(1),
        function(error, stdout, stderr) {
            console.log('stdout',stdout);
            console.log('stderr',stderr);
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
                cb(err);
                return;
            }
            if(cb) cb();
        }
    );
}
