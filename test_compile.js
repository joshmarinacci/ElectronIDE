var fs = require('fs');
var compile = require('./compile');
var uploader = require('./uploader');
var platform = require('./platform');
var boards = require('./boards');

//clean the build path
var outpath = "build/out";



//var sketchPath = 'test/examples/NESTest/';
var sketchPath = '/Users/josh/projects/Digistump/hardware/digistump/avr/libraries/SPI/examples/DigitalPotControl';
//var sketchPath = '/Users/josh/Documents/Arduino/BetterName2';

//setup standard options
var options = {
    name: sketchPath.substring(sketchPath.lastIndexOf('/')),
}
options.device = boards.getBoard('uno');
options.device = boards.getBoard('digispark-pro');
options.platform = platform.getPlatform(options.device);


var debug = function(res) {
    console.log("LOG",res.message);
}
options.platform.installIfNeeded(function() {
    compile.compile(sketchPath,outpath,options, debug, sketchPath, function() {
        console.log("done with compiling");
    });
},debug);
