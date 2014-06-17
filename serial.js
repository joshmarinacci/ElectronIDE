var SerialPort = require('serialport').SerialPort;

var sp = null;
exports.open = function(port, cb) {
    console.log('opening the serial port',port);
    sp = new SerialPort(port,{
        baudrate:9600
    });
    sp.on('open',function() {
        console.log('port finally opened');
        sp.on('data',function(data) {
            //console.log("got some data",data.toString());
            cb(data);
        });
        sp.on('close',function(err) {
            console.log('port closed from the other end');
            cb(err);
        });
        sp.on('error',function(err) {
            console.log('serial port error');
            cb(err);
        });
    });
}

exports.close = function(port) {
    console.log("closing the serial port",port);
    sp.close(function(err) {
        console.log("the port is really closed now");
    });
}
