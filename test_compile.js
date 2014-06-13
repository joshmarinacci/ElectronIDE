var fs = require('fs');
var compile = require('./compile');
var uploader = require('./uploader');

var BOARDS = require('./boards').loadBoards();
var UNO = null;
BOARDS.forEach(function(board) {
    if(board.id == 'uno') UNO = board;
});


//clean the build path
var outpath = "build/out";
if(fs.existsSync(outpath)) {
    fs.readdirSync(outpath).forEach(function(file) {
        fs.unlinkSync(outpath+'/'+file);
    })
    fs.rmdirSync(outpath);
}
fs.mkdirSync(outpath);


var sketchPath = 'test/examples/Blink/';

//setup standard options
var options = {
    userlibs: "/Users/josh/Documents/Arduino/Libraries",
    root: "/Applications/Arduino.app/Contents/Resources/Java",
    name: 'Blink',
}
options.hardware = options.root +'/hardware';
options.avrbase  = options.root +'/hardware/tools/avr/bin';
options.device = UNO;

//console.log("options = ",options);

compile.compile(sketchPath,outpath,options);


var port = '/dev/cu.usbserial-AH019ZWX';
//uploader.upload('build/out/Blink.hex',port,options);
