var fs = require('fs');
var os = require('os');
var master = require('./master');
var compile = require('./compile');
var uploader = require('./uploader');
var platform = require('./platform');
var boards = require('./boards');

//clean the build path
//var outpath = "build/out";
var BUILD_DIR = os.tmpdir() + '/build/out';



//var sketchPath = 'test/examples/NESTest/';
//var sketchPath = '/Users/josh/projects/Digistump/hardware/digistump/avr/libraries/SPI/examples/DigitalPotControl';
//var sketchPath = '/Users/josh/Documents/Arduino/BetterName2';
var sketchPath = '/Users/josh/Documents/Arduino/BleRobot2';
//var sketchPath = '/Users/josh/Documents/Arduino/DigitalPotControl';
//var sketchPath = '/Users/josh/Documents/Arduino/DrawBot2';

/*

//setup standard options
var options = {
    name: sketchPath.substring(sketchPath.lastIndexOf('/')),
}
options.device = boards.getBoard('uno');
options.device = boards.getBoard('digispark-pro');
//options.device = boards.getBoard('flora');
if(options.device == null) {
    throw new Error('Device Not Found');
}
options.platform = platform.getPlatform(options.device);


var debug = function(res) {
    console.log("LOG",res.message);
}

options.platform.installIfNeeded(function() {
    compile.compile(sketchPath,BUILD_DIR,options, debug, sketchPath, function() {
        console.log("done with compiling");
    });
},debug);
*/

//var code = fs.readFileSync(sketchPath+'/DrawBot2.ino').toString();
var code = fs.readFileSync(sketchPath+'/BleRobot2.ino').toString();
//console.log('code = ', code);
master.doCompile(code, "uno", 'DrawBot2',
function() {
    console.log('called back');
},
function() {
//    console.log('errored');
}
);
