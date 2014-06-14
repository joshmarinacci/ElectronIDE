var uploader = require('./uploader');

var BOARDS = require('./boards').loadBoards();
var UNO = null;
var LEO = null;
BOARDS.forEach(function(board) {
    if(board.id == 'uno') UNO = board;
    if(board.id == 'leonardo') LEO = board;
});

var options = {
    userlibs: "/Users/josh/Documents/Arduino/Libraries",
    root: "/Applications/Arduino.app/Contents/Resources/Java",
    name: 'Blink',
}
options.hardware = options.root +'/hardware';
options.avrbase  = options.root +'/hardware/tools/avr/bin';
options.device = LEO;

var port = '/dev/cu.usbmodem1421';
uploader.upload('build/out/Blink.hex',port,options);
