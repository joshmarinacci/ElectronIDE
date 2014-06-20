var fs = require('fs');
var spawn = require('child_process').spawn;
var http = require('http');
var unzip = require('unzip');

var settings = require('./settings.js');
var master = null;
var libs = null;

console.log("inside of the libraries");

function isInstalled() {
    //console.log('checking if',this.id,'is installed');
    if(this.source == 'ide') return true;
    if(fs.existsSync(settings.repos+'/'+this.id)) return true;
    return false;
}

function getIncludePath() {
    if(this.source == 'ide') {
        return settings.root+'/libraries/'+this.location;
    }
    if(this.path) {
        return settings.repos+'/'+this.id+'/'+this.path;
    }
    return settings.repos+'/'+this.id;
}

function install(cb) {
    if(!fs.existsSync(settings.repos)) {
        fs.mkdirSync(settings.repos);
    }

    console.log('installing',this.id);
    if(this.source == 'git') {
        var bin = 'git';
        var cmd = [
            'clone',
            this.location,
            settings.repos+'/'+this.id,
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
        var outpath = settings.repos;
        var req = http.get(this.location)
            .on('response',function(res){
                //console.log("response");
                /*
                res.on('error',function(err){
                    console.log('err');
                })
                .on('end',function(){
                    console.log("fisinshed download");
                })
                */
                res.pipe(unzip.Extract({path:outpath}))
                .on('close',function() {
                    console.log("finished inflating");
                    if(cb) cb(null);
                })
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
            lib.getIncludePath = getIncludePath;
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
