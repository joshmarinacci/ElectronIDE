var fs = require('fs');
var spawn = require('child_process').spawn;
var http = require('http');
var AdmZip = require('adm-zip');
var platform = require('./platform');



var settings = require('./settings.js');
var master = null;
var libs = null;
var plat = platform.getDefaultPlatform();


function isInstalled() {
    console.log('checking if',this.id,'is installed');
    if(this.source == 'ide') return true;
    var path = plat.getReposPath()+'/'+this.id;
    console.log('checking if path exists',path);
    if(fs.existsSync(plat.getReposPath()+'/'+this.id)) return true;
    return false;
}

function getIncludePaths(platform) {
    if(this.source == 'ide') {
        var path = platform.getStandardLibraryPath()+'/'+this.location;
        //console.log("files = ",fs.readdirSync(path));
        var paths = [];
        paths.push(path);
        fs.readdirSync(path).forEach(function(filename) {
            if(fs.statSync(path+'/'+filename).isDirectory()) {
                if(filename != 'examples') {
                    //console.log("found a subdir of files. use it",filename);
                    paths.push(path+'/'+filename);
                }
            }
        });
        return paths;
    }
    if(this.path) {
        return [plat.getReposPath()+'/'+this.id+'/'+this.path];
    }
    return [plat.getReposPath()+'/'+this.id];
}

function install(cb) {
    if(!fs.existsSync(plat.getReposPath())) {
        fs.mkdirSync(plat.getReposPath());
    }

    console.log('installing',this.id);
    if(this.source == 'git') {
        var bin = 'git';
        var cmd = [
            'clone',
            this.location,
            plat.getReposPath()+'/'+this.id,
        ];
        console.log("execing",bin,cmd);
        var proc = spawn(bin,cmd);
        proc.stdout.on('data',function(data) {
            console.log("STDOUT",data.toString());
        });
        proc.stderr.on('data',function(data) {
            console.log("STDERR",data.toString());
        });
        proc.on('close',function(code) {
            console.log("exited with code",code);
            if(cb) cb(null);
        });
    }

    if(this.source == 'http'){
        console.log("source is http",this.location);
        var outpath = plat.getReposPath();
        var outfile = plat.getReposPath()+'/'+this.location.substring(this.location.lastIndexOf('/')+1);
        console.log("output file = ",outfile);
        var req = http.get(this.location)
            .on('response',function(res){
                console.log("response");
                res.pipe(fs.createWriteStream(outfile)).on('close',function(){
                    console.log('finished downloading');
                    var zip = new AdmZip(outfile);
                    var zipEntries = zip.getEntries();
                    var rootpath = zipEntries[0].entryName;
                    rootpath = rootpath.substring(0,rootpath.indexOf('/'));
                    console.log("rootpath of the zip is",rootpath);
                    zip.extractAllTo(plat.getReposPath(),true);
                    console.log('done extracting from ',outfile, 'to',plat.getReposPath());
                    fs.renameSync(plat.getReposPath()+'/'+rootpath, plat.getReposPath()+'/'+rootpath.toLowerCase());
                    if(cb) cb(null);
                });
            });
        req.end();
    }

}

function init() {
    if(libs == null) {
        libs = [];
        fs.readdirSync(settings.datapath).forEach(function(file){
            var str = fs.readFileSync(settings.datapath+'/'+file).toString();
            var lib = JSON.parse(str);
            lib.isInstalled = isInstalled;
            lib.install = install;
            lib.getIncludePaths = getIncludePaths;
            libs.push(lib);
        });
    }
}

init();

function collectdeps(lib,deps) {
    if(lib.dependencies) {
        for(var i=0; i<lib.dependencies.length; i++) {
            var dep = lib.dependencies[i];
            var deplib = exports.getById(dep);
            console.log("dep lib = ",dep,deplib);
            if(deplib && !deplib.isInstalled()) {
                deps.push(deplib);
            };
            collectdeps(deplib,deps);
        }
    }
}

exports.install = function(targets, cb) {
    console.log("installing libraries: ", targets);
    var toinstall = targets
        .map(function(libname) {
            console.log("looking at libname", libname);
            return exports.getById(libname);   })
        .filter(function(lib)  {
            if(lib == null) return false;
            return !lib.isInstalled();
          });
    //console.log("need to install", toinstall);
    var deps = [];
    toinstall.forEach(function(lib) {
        collectdeps(lib,deps);
    });
    //console.log('deps = ',deps);
    toinstall = toinstall.concat(deps);

    function installit(list) {
        //console.log('list to install',list);
        if(list.length <= 0) {
            //console.log("done with the list");
            cb(null);
            return;
        }
        var lib = list.shift();
        //console.log("installing",lib);
        lib.install(function() {
            console.log("installed lib");
            installit(list);
        })
    }
    installit(toinstall);
    //cb(null);
}

exports.search = function(str,cb) {
    str = str.toLowerCase();
    var results = [];
    libs.forEach(function(lib) {
        if(lib.name.toLowerCase().indexOf(str)>=0) {
            results.push(lib);
            return;
        }
        for(var i=0; i<lib.tags.length; i++) {
            if(lib.tags[i].toLowerCase().indexOf(str)>=0) {
                results.push(lib);
                return;
            }
        }
    });
    cb(results);
}

exports.getById = function(id) {
    for(var i=0; i<libs.length; i++) {
        if(libs[i].id == id.toLowerCase()) {
            return libs[i];
        }
    }
    return null;
}

exports.isUserLib = function(libname, plat) {
    console.log("is user lib? = ",libname);
    var dir = plat.getUserLibraryDir()+'/'+libname;
    console.log('dir = ',dir);
    if(fs.existsSync(dir)) {
        console.log('exists. its a user lib');
        return true;
    }
    return false;
}

exports.getUserLib = function(libname, plat) {
    return {
        isInstalled : function() { return true; },
        getIncludePaths: function(plat) {
            return [plat.getUserLibraryDir()+'/'+libname];
        },
    }
}
