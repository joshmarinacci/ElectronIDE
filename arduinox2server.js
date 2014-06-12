var fs = require('fs');
var express = require('express');
var multer = require('multer');
var moment = require('moment');
var http   = require('http');
var sp = require('serialport');
var compile = require('./compile');
var uploader = require('./uploader');

var settings = require('./settings.js');

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

app.get('/sketches',function(req,res) {
    var sketches = fs.readdirSync(settings.usersketches);
    sketches = sketches.filter(function(file) {
        if(file.toLowerCase() == 'libraries') return false;
        return true;
    });
    res.send(JSON.stringify(sketches));
    res.end();
});

app.get('/sketch/:name',function(req,res) {
    console.log(req.params.name);

    var dir = settings.usersketches + '/' + req.params.name;
    var obj = {
        name:req.params.name,
        files:[]
    };
    fs.readdirSync(dir).forEach(function(filename) {
        var file = fs.readFileSync(dir+'/'+filename);
        //console.log("file",file.toString());
        if(filename.toLowerCase() == 'info.json') {
            console.log("info file");
            obj.info = JSON.parse(file.toString());
            console.log("info = ",obj.info);
            return;
        }
        obj.files.push({
            filename:filename,
            content:file.toString(),
        });
    });

    res.send(obj);
    res.end();
});

app.get('/docs/library/:name',function(req,res) {
    console.log("looking up docs for ",req.params.name);
    var libname = req.params.name;
    if(libname == 'AccelStepper') {
        res.send({
            classes:[
                {
                    name:'AccelStepper',
                    constants:[
                        'FUNCTION',
                        'DRIVER',
                        'FULL2WIRE',
                        'FULL3WIRE',
                        'FULL4WIRE',
                        'HALF3WIRE',
                        'HALF4WIRE',
                    ],
                    constructors:[
                    {
                        name:'AccelStepper',
                        args:['interface','pin1','pin2','pin3','pin4','enable'],
                    },
                    {
                        name:'AccelStepper',
                        args:['*forward','*backward'],
                    }
                    ],
                    methods:[
                        {name:'moveTo',args:['absolute'],ret:'void'},
                        {name:'move',args:['relative'],ret:'void'},
                        {name:'run',args:[],ret:'boolean'},
                        {name:'runSpeed',args:[],ret:'boolean'},
                    ],
                }
            ]
            });
        res.end();
        return;
    }
    res.send({bar:'foo'});
    res.end();
})

app.get('/libraries',function(req,res) {

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
    console.log('listening on port ', server.address().port);
});
