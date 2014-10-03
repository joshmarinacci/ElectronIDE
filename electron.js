var master = require('./master');

var fs = require('fs');
var path = require('path');
var express = require('express');
var multer = require('multer');
var moment = require('moment');
var http   = require('http');
var websocket = require('nodejs-websocket');
var bodyParser = require('body-parser');




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
    master.listPorts(function(err, list) {
        res.json(list).end();
    });
});


app.get('/boards',function(req,res) {
    res.json(master.getBoards()).end();
});


app.post('/compile',function(req,res) {
    console.log("code = ",req.body);
    if(!req.body.board) return res.json({status:'missing board name'}).end();
    try {
        master.doCompile(req.body.code, req.body.board, req.body.sketch, function(err) {
            if(err) return res.json({status:'error',message:err}).end();
            res.json({status:'okay'}).end();
        }, publishEvent);

    } catch(e) {
        console.log("compilation error",e);
        console.log(e.output);
        publishEvent({ type:'error', message: e.toString(), output: e.output});
        res.json({status:'error',output:e.output, message: e.toString()}).end();
    }
});

app.post('/run',function(req,res) {
    console.log("body = ",req.body.code);
    if(!req.body.board) return res.json({status:'error', message:'missing board name'}).end();
    if(!req.body.port)  return res.json({status:'error', message:'missing port name'}).end();

    master.doCompile(req.body.code,req.body.board,req.body.sketch, function(err) {
        if(err) return res.json({status:'compile error'}).end();

        console.log("compile is done. now on to uploading to hardware");
        var sketch = path.join('build', 'out', req.body.sketch+'.hex');
        var port = req.body.port;

        function doUpload() {
            master.upload(sketch,port, publishEvent, function(err) {
                console.log("fully done with upload",err);
                if(err) {
                    return res.json({status:'upload error',err:err}).end();
                }

                res.json({status:'okay'}).end();
                //wait 1500ms before reopening to let everything settle down a bit.
                if(SERIAL.open) {
                    console.log('waiting 1500ms');
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
    },publishEvent);
});

/*
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
*/

/*
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
*/

/*
app.get('/sketches',function(req,res) {
    master.listSketches(function(list) {
        res.send(JSON.stringify(list));
        res.end();
    });
});
*/
app.post('/sketches_new',function(req,res) {
    console.log("getting some new sketches",req.body);;
    master.makeNewSketch(req.body.name, function(result){ res.json(result).end() });
})
app.post('/sketches_delete',function(req,res) {
    console.log("deleting a sketch",req.body);;
    master.deleteSketch(req.body.name, function(result){ res.json(result).end() });
})

app.get('/sketches',function(req,res) {
    master.listSketches(function(list) {
        res.json(list).end();
    });
})

/*
app.post('/save',function(req,res) {
    sketches.saveSketch(req.body.name,req.body.code,function(results) {
        res.json({status:'okay', name:req.body.name}).end();
    });
});
*/

app.get('/sketch',function(req,res) {
    var path = req.query.id.substring(0,req.query.id.lastIndexOf('/'));
    master.getSketch(path, function(sketch) {
        res.json(sketch).end();
    });
});

/*
app.get('/sketchfile', function(req,res) {
    sketches.getFile(req.query.id,function(file) {
        res.json(file).end();
    })
});
*/

app.get('/search',function(req,res){
    master.searchLibraries(req.query.query, function(results) {
        res.json(results).end();
    });
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
