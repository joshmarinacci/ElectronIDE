var SerialPort = require('serialport').SerialPort;

var sp = null;
exports.open = function(port, rate, cb) {
    console.log('opening the serial port',port,'at rate',rate);
    sp = new SerialPort(port,{
        baudrate:rate
    });
    sp.on('open',function() {
        console.log('port finally opened');
        sp.on('data',function(data) {
            //console.log("got some data",data.toString());
            cb(data);
        });
        sp.on('close',function(err) {
            console.log('port closed from the other end',err);
            cb(err);
        });
        sp.on('error',function(err) {
            console.log('serial port error',err);
            cb(err);
        });
    });
}

exports.close = function(port, cb) {
    console.log("closing the serial port",port);
    sp.close(function(err) {
        console.log("the port is really closed now");
        if(cb) cb();
    });
}

exports.send = function(message, cb)  {
    sp.write(message+'\n',function(err, results) {
        console.log('err', err);
        console.log('results',results);
        if(cb)cb(err,results);
    });
}
