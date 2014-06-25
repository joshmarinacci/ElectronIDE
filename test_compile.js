var fs = require('fs');
var compile = require('./compile');
var uploader = require('./uploader');
var platform = require('./platform');
var boards = require('./boards');

//clean the build path
var outpath = "build/out";



//var sketchPath = 'test/examples/NESTest/';
var sketchPath = '/Users/josh/Documents/Arduino/BetterName2';

//setup standard options
var options = {
    //userlibs: "/Users/josh/Documents/Arduino/Libraries",
    name: 'BetterName2',
}
options.device = boards.getBoard('xadow');
options.platform = platform.getDefaultPlatform();

var debug = function(res) {
    console.log("LOG",res.message);
}
options.platform.installIfNeeded(function() {
    console.log("options = ",options);
    compile.compile(sketchPath,outpath,options, debug, sketchPath, function() {
        console.log("done with compiling");
    });
},debug);
