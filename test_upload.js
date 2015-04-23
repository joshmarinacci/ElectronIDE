var uploader = require('./uploader');
var boards = require('./boards');
var platform = require('./platform');
var compile = require('./compile');

//var sketchPath = '/Users/josh/projects/Digistump/hardware/digistump/avr/libraries/SPI/examples/DigitalPotControl';
var sketchPath = 'test/examples/Blink';
var options = {
    name: sketchPath.substring(sketchPath.lastIndexOf('/')),
}
//options.device = boards.getBoard('uno');
options.device = boards.getBoard('digispark-pro');
//options.device = boards.getBoard('trinket5');
options.platform = platform.getPlatform(options.device);

var debug = function(res) {
    console.log("LOG",res.message);
}
//clean the build path
var outpath = "build/out";
console.log('installed already?', options.platform.isInstalled());
options.platform.installIfNeeded(function() {
    compile.compile(sketchPath,outpath,options, debug, sketchPath, function() {
        console.log("done with compiling");
        var port = '/dev/cu.usbmodem1421';
        uploader.upload('build/out/Blink.hex',port,options,
            function(msg) {
                console.log("LOG",msg);
            },
            function() {
                console.log("DONE");
            });
    });
},debug);
