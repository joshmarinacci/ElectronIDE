console.log("inside of the master controller");
var fs = require('fs');
var path = require('path');
var compile = require('./compile');
//var sp = require('serialport');
var uploader = require('./uploader');
var settings = require('./settings.js');
var sketches = require('./sketches.js');
//var serial = require('./serial.js');
var platform = require('./platform');
var LIBS   = require('./libraries');
var BOARDS = require('./boards').loadBoards();
var OPTIONS = {
    userlibs: settings.userlibs
}
console.log('settings',settings);
console.log("options",OPTIONS);


function makeCleanDir(outpath) {
    if(fs.existsSync(outpath)) {
        fs.readdirSync(outpath).forEach(function(file) {
            fs.unlinkSync(outpath+'/'+file);
        })
        fs.rmdirSync(outpath);
    }
    fs.mkdirSync(outpath);
    return outpath;
}


exports.listPorts = function(cb) {
    sp.list(function(err,list) {
        // format the data (workaround serialport issue on Win (&*nix?))
        list.forEach(function(port) {
            if(port.pnpId){
                var data = /^USB\\VID_([a-fA-F0-9]{4})\&PID_([a-fA-F0-9]{4})/.exec(port.pnpId);
                if(data){
                    port.vendorId = port.vendorId || '0x'+data[1];
                    port.productId = port.productId || '0x'+data[2];
                }
            }
        });
        cb(err,list);
    });

}


exports.getBoards = function() {
    return BOARDS;
}


exports.doCompile = function(code,board,sketch, cb, publishEvent) {
    //create output dir
    if(!fs.existsSync('build')) {
        fs.mkdirSync('build');
    }
    var outpath = makeCleanDir('build/out');
    var sketchpath = makeCleanDir("build/tmp");
    var inoFile = path.join(sketchpath, sketch + '.ino');
    fs.writeFileSync(inoFile, code);

    publishEvent({ type:'compile', message:'writing to ' + inoFile });

    var foundBoard = null;
    BOARDS.forEach(function(bd) {
        if(bd.id == board) foundBoard = bd;
    })
    OPTIONS.device = foundBoard;
    OPTIONS.platform = platform.getPlatform(OPTIONS.device);
    OPTIONS.platform.installIfNeeded(function() {
        OPTIONS.name = sketch;
        compile.compile(sketchpath,outpath,OPTIONS, publishEvent,
                path.join(OPTIONS.platform.getUserSketchesDir(), sketch), cb);
    }, function(per) {
        console.log("percentage = ",per);
    });
}

exports.getSketch = function (path, cb) {
    sketches.getSketch(path,cb);
}

exports.listSketches = function(cb) {
    sketches.listSketchesFull(cb);
}

exports.searchLibraries = function(query,cb) {
    LIBS.search(query,cb);
}

exports.upload = function(sketch, port, pub, cb) {
    uploader.upload(sketch,port,OPTIONS,pub,cb);
}
