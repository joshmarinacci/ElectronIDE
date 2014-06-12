var fs = require('fs');
var express = require('express');
var multer = require('multer');
var moment = require('moment');
var http   = require('http');
var sp = require('serialport');


var app = express();
//parse post bodies
app.use(multer({dest:'./uploads'}));

//public is the dir for static files
app.use(express.static(__dirname+'/public'));

app.get('/status',function(req,res){

});

app.get('/ports',function(req,res) {
    sp.list(function(err,list) {
        console.log(list);
        res.send(JSON.stringify(list));
        res.end();
    });
})


var server = app.listen(54329,function() {
    console.log('listening on port ', server.address().port);
});
