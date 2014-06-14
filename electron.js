var fs = require('fs');
var express = require('express');
var multer = require('multer');
var moment = require('moment');
var http   = require('http');
var sp = require('serialport');
var compile = require('./compile');
var uploader = require('./uploader');

var settings = require('./settings.js');
var sketches = require('./sketches.js');

//load up standard boards
var BOARDS = require('./boards').loadBoards();
var LIBS   = require('./libraries').loadLibraries();
//standard options
var OPTIONS = {
    userlibs: settings.userlibs,
    root: settings.root,
    hardware: settings.root + '/hardware',
    avrbase: settings.root + '/hardware/tools/avr/bin',
    name: 'Blink',
}

console.log('settings',settings);
console.log("options",OPTIONS);

var app = express();
//parse post bodies
app.use(multer({dest:'./uploads'}));

//public is the dir for static files
app.use(express.static(__dirname+'/public'));

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
    console.log('making build dir');
    if(!fs.existsSync('build')) {
        fs.mkdirSync('build');
    }
    console.log('making build/out dir');
    var outpath = makeCleanDir('build/out');
    console.log('making build/tmp dir');
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
    try {
        doCompile(req.body.code,req.body.board);
        res.send(JSON.stringify({status:'okay'}));
        res.end();

    } catch(e) {
        console.log("compliation error",e);
        console.log(e.output);
        res.send(JSON.stringify({status:'error',output:e.output}));
        res.end();
    }
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

app.post('/new',function(req,res) {
    console.log(req.body.name);
    if(!req.body.name) {
        res.send(JSON.stringify({status:'missing sketch name'}));
        res.end();
        return;
    }
    try {
        var sketch = req.body.name;
        sketches.makeNewSketch(sketch, function(name,content) {
            res.send(JSON.stringify({status:'okay',content:content, name:sketch}));
            res.end();
        });
    } catch(err) {
        console.log(err);
        err.printStackTrace();
        res.end(JSON.stringify({status:'error',output:err.toString()}));
    }
});

app.post('/sketches/delete', function(req,res){
    console.log(req.body.name);
    if(!req.body.name) {
        res.send(JSON.stringify({status:'missing sketch name'}));
        res.end();
        return;
    }

    try {
        sketches.deleteSketch(req.body.name,function(name) {
            res.send(JSON.stringify({status:'okay', name:name}));
            res.end();
        });
    } catch (err) {
        console.log(err);
        res.end(JSON.stringify({status:'error',output:err.toString()}));
    }
});

app.get('/sketches',function(req,res) {
    sketches.listSketches(function(list) {
        res.send(JSON.stringify(list));
        res.end();
    });
});

app.post('/save',function(req,res) {
    console.log(req.body.name);
    console.log(req.body.code);
    sketches.saveSketch(req.body.name,req.body.code,function(results) {
        console.log(" saved");
        res.send(JSON.stringify({status:'okay', name:req.body.name}));
        res.end();
    });
});

app.get('/sketch/:name',function(req,res) {
    sketches.getSketch(req.params.name, function(sketch) {
        res.send(sketch);
        res.end();
    });
});

app.get('/search',function(req,res){
    console.log("searching for",req.query);
    LIBS.search(req.query.query,function(results) {
        console.log("found libs",results);
        res.send(results);
        res.end();
    })
})

var server = app.listen(54329,function() {
    console.log('open your browser to http://localhost:'+server.address().port+'/');
});
