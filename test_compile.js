var fs = require('fs');
var compile = require('./compile');
var uploader = require('./uploader');
var platform = require('./platform');

var BOARDS = require('./boards').loadBoards();
var UNO = null;
var LEO = null;
BOARDS.forEach(function(board) {
    if(board.id == 'uno') UNO = board;
    if(board.id == 'leonardo') LEO = board;
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
    name: 'Blink',
}
options.device = LEO;
options.platform = platform.getDefaultPlatform();
console.log("options = ",options);

compile.compile(sketchPath,outpath,options, function(){}, sketchPath);

var port = '/dev/cu.usbmodem1421';
//uploader.upload('build/out/Blink.hex',port,options);
