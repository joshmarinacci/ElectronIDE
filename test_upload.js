var uploader = require('./uploader');
var boards = require('./boards');
var platform = require('./platform');

var options = {
    userlibs: "/Users/josh/Documents/Arduino/Libraries",
    name: 'Blink',
}
options.device = boards.getBoard('uno');
options.platform = platform.getDefaultPlatform();

var port = '/dev/cu.usbmodem1421';
uploader.upload('build/out/Blink.hex',port,options,
    function(msg) {
        console.log("LOG",msg);
    },
    function() {
        console.log("DONE");
    });
