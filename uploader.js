var sp = require('serialport');
var sh = require('execSync');

sp.list(function(err,list) {
    console.log(list);
});

var options = {
    userlibs: "/Users/josh/Documents/Arduino/Libraries",
    root: "/Applications/Arduino.app/Contents/Resources/Java",
    name: 'Blink',
    device: {
        protocol: 'arduino',
    }
}
options.device = {
    mcu:'atmega328p',
    fcpu:'16000000L',
    vid:'',
    pid:'',
    protocol:'arduino',
    uploadspeed:115200
}

exports.upload = function(hexfile) {
    console.log("uploading to device using ",options.device.protocol);
//    var serialpath = "/tty/foobar";
    var serialpath = '/dev/cu.usbserial-AH019ZWX';
    var uploadcmd = [
        options.root+'/hardware/tools/avr/bin/avrdude',
        '-C'+options.root+'/hardware/tools/avr/etc/avrdude.conf',
        '-v','-v','-v', //super verbose
        '-p'+options.device.mcu,
        '-c'+options.device.protocol,
        '-P'+serialpath,
        '-b'+options.device.uploadspeed,
        '-D', //don't erase
        '-Uflash:w:'+hexfile+':i',
    ];

    console.log("running", uploadcmd.join(' '));
    var result = sh.exec(uploadcmd.join(' '));
    console.log(result.stdout);
}
