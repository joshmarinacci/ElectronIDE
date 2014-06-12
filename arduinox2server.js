var fs = require('fs');
var express = require('express');
var multer = require('multer');
var moment = require('moment');
var http   = require('http');
var sp = require('serialport');
var compile = require('./compile');
var uploader = require('./uploader');




//load up standard boards
var BOARDS = require('./boards').loadBoards();
//standard options
var OPTIONS = {
    userlibs: "/Users/josh/Documents/Arduino/Libraries",
    root: "/Applications/Arduino.app/Contents/Resources/Java",
    name: 'Blink',
}
OPTIONS.hardware = OPTIONS.root +'/hardware';
OPTIONS.avrbase  = OPTIONS.root +'/hardware/tools/avr/bin';


var app = express();
//parse post bodies
app.use(multer({dest:'./uploads'}));

//public is the dir for static files
app.use(express.static(__dirname+'/public'));

app.get('/status',function(req,res){

});

app.get('/ports',function(req,res) {
    sp.list(function(err,list) {
        res.send(JSON.stringify(list));
        res.end();
    });
});

app.get('/boards',function(req,res) {
    res.send(JSON.stringify(BOARDS));
    res.end();
})

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

function doCompile(code,board) {
    //create output dir
    var outpath = makeCleanDir('build/out');
    var sketchpath = makeCleanDir("build/tmp");
    fs.writeFileSync(sketchpath+'/Blink.ino',code);

    var foundBoard = null;
    BOARDS.forEach(function(bd) {
        if(bd.id == board) foundBoard = bd;
    })
    OPTIONS.device = foundBoard;
    compile.compile(sketchpath,outpath,OPTIONS);
}

app.post('/compile',function(req,res) {
    console.log("code = ",req.body.code);
    if(!req.body.board) {
        res.send(JSON.stringify({status:'missing board name'}));
        res.end();
        return;
    }
    doCompile(req.body.code,req.body.board);
    res.send(JSON.stringify({status:'okay'}));
    res.end();
});

app.post('/run',function(req,res) {
    console.log("body = ",req.body.code);
    if(!req.body.board) {
        res.send(JSON.stringify({status:'missing board name'}));
        res.end();
        return;
    }
    if(!req.body.port) {
        res.send(JSON.stringify({status:'missing port name'}));
        res.end();
        return;
    }

    doCompile(req.body.code,req.body.board);
    uploader.upload('build/out/Blink.hex',req.body.port,OPTIONS);
    res.send(JSON.stringify({status:'okay'}));
    res.end();
});




var server = app.listen(54329,function() {
    console.log('listening on port ', server.address().port);
});
