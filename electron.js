var fs = require('fs');
var express = require('express');
var multer = require('multer');
var moment = require('moment');
var http   = require('http');
var sp = require('serialport');
var compile = require('./compile');
var uploader = require('./uploader');
var websocket = require('nodejs-websocket');
var path = require('path');
var bodyParser = require('body-parser');

var settings = require('./settings.js');
var sketches = require('./sketches.js');
var serial = require('./serial.js');
var platform = require('./platform');

//load up standard boards
var BOARDS = require('./boards').loadBoards();
var LIBS   = require('./libraries');
//standard options
var OPTIONS = {
    userlibs: settings.userlibs
}

console.log('settings',settings);
console.log("options",OPTIONS);

var wslist = [];
function publishEvent(evt) {
    wslist.forEach(function(conn) {
        conn.sendText(JSON.stringify(evt));
    });
}


var app = express();
//parse post bodies
app.use(multer({dest:'./uploads'}));
app.use(bodyParser.json());

//public is the dir for static files
app.use(express.static(__dirname+'/public'));

app.get('/ports',function(req,res) {
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

function doCompile(code,board,sketch, cb) {
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
        compile.compile(sketchpath,outpath,OPTIONS, publishEvent, path.join(OPTIONS.platform.getUserSketchesDir(), sketch), cb);
    }, function(per) {
        //console.log("percentage = ",per);
    });
}

app.post('/compile',function(req,res) {
    console.log("code = ",req.body);
    if(!req.body.board) {
        res.send(JSON.stringify({status:'missing board name'}));
        res.end();
        return;
    }
    try {
        doCompile(req.body.code, req.body.board, req.body.sketch, function() {
            res.send(JSON.stringify({status:'okay'}));
            res.end();
        });

    } catch(e) {
        console.log("compilation error",e);
        console.log(e.output);
        res.send(JSON.stringify({status:'error',output:e.output, message: e.toString()}));
        publishEvent({ type:'error', message: e.toString(), output: e.output});
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

    doCompile(req.body.code,req.body.board,req.body.sketch, function(err) {
        console.log("compile is done. now on to uploading to hardware");
        if(err) {
            res.send(JSON.stringify({status:'compile error'}));
            res.end();
            return;
        }
        var sketch = path.join('build', 'out', req.body.sketch+'.hex');
        var port = req.body.port;

        function doUpload() {
            uploader.upload(sketch,port, OPTIONS, publishEvent, function() {
                console.log("fully done with upload");
                res.send(JSON.stringify({status:'okay'}));
                res.end();
                //wait 500ms before reopening to let everything settle down a bit.
                if(SERIAL.open) {
                    console.log('waiting 1000ms');
                    setTimeout(function() {
                        console.log("finished waiting");
                        serial.open(SERIAL.port, SERIAL.rate, SERIAL.callback);
                    },1500);
                }
            })
        }
        if(SERIAL.open) {
            console.log("closing serial port and waiting 1000ms");
            serial.close(SERIAL.port, function() { setTimeout(doUpload,1500) });
        } else {
            doUpload();
        }
    });
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

app.post('/rename',function(req,res) {
    console.log(req.body.name);
    if(!req.body.oldname) {
        res.send(JSON.stringify({status:'missing sketch old name'}));
        res.end();
        return;
    }
    if(!req.body.newname) {
        res.send(JSON.stringify({status:'missing sketch new name'}));
        res.end();
        return;
    }

    try {
        var oldname = req.body.oldname;
        var newname = req.body.newname;
        sketches.renameSketch(oldname,newname, function(name) {
            res.send(JSON.stringify({status:'okay', name:name}));
            res.end();
        })
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
app.get('/sketchtree',function(req,res) {
    sketches.listSketchesFull(function(list) {
        res.send(JSON.stringify(list));
        res.end();
    });
})

app.post('/save',function(req,res) {
    sketches.saveSketch(req.body.name,req.body.code,function(results) {
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

app.get('/sketchfile', function(req,res) {
    sketches.getFile(req.query.id,function(file) {
        res.json(file);
        res.end();
    })
});

app.get('/search',function(req,res){
    LIBS.search(req.query.query,function(results) {
        res.send(results);
        res.end();
    })
})


var SERIAL = {
    port: "-1",
    open: false,
    rate: -1,
    callback: function(data) {
        if(data) {
            var msg = {
                type:'serial',
                data:data.toString(),
            };
            wslist.forEach(function(conn) {
                conn.sendText(JSON.stringify(msg));
            });
        } else {
            console.log("ERR: callback called with no data!")
        }

    }
}




app.post('/serial/open', function(req,res) {
    if(!req.body.port) {
        res.send(JSON.stringify({status:'error', message:'missing serial port'}));
        res.end();
        return;
    }
    if(!req.body.rate) {
        res.send(JSON.stringify({status:'error', message:'missing serial port'}));
        res.end();
        return;
    }
    SERIAL.port = req.body.port;
    SERIAL.rate = req.body.rate;
    serial.open(SERIAL.port, SERIAL.rate, SERIAL.callback);
    SERIAL.open = true;
    res.end(JSON.stringify({status:'okay',message:'opened'}));
});

app.post('/serial/close', function(req,res) {
    if(!req.body.port) {
        res.send(JSON.stringify({status:'error', message:'missing serial port'}));
        res.end();
        return;
    }
    SERIAL.open = false;
    serial.close(SERIAL.port, function() {
        res.end(JSON.stringify({status:'okay',message:'closed'}));
    });
});

app.post('/serial/send', function(req,res) {
    if(!req.body.port) {
        res.send(JSON.stringify({status:'error', message:'missing serial port'}));
        res.end();
        return;
    }
    if(!SERIAL.open) {
        res.end(JSON.stringify({status:'error', message:'serial port not open'}));
        return;
    }
    serial.send(req.body.message, function(err, results) {
        res.end(JSON.stringify({status:'okay', message:'sent message'}));
    })
});

var server = app.listen(54329,function() {
    console.log('open your browser to http://localhost:'+server.address().port+'/');
});


var wss = websocket.createServer(function(conn) {
    console.log('web socket connected');
    wslist.push(conn);
    conn.on('message',function(message) {
        console.log("got a request");
    });
    conn.on('error',function(err){
        console.log('websocket got an error',err);
    });
    conn.on('close',function(code,reason) {
        console.log("websocket closed",code,reason);
    });
}).listen(4203);
