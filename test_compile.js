var fs = require('fs');
var compile = require('./compile');
var uploader = require('./uploader');
var platform = require('./platform');
var boards = require('./boards');

//clean the build path
var outpath = "build/out";
if(fs.existsSync(outpath)) {
    fs.readdirSync(outpath).forEach(function(file) {
        fs.unlinkSync(outpath+'/'+file);
    })
    fs.rmdirSync(outpath);
}
fs.mkdirSync(outpath);


var sketchPath = 'test/examples/NESTest/';

//setup standard options
var options = {
    //userlibs: "/Users/josh/Documents/Arduino/Libraries",
    name: 'NESTest',
}
options.device = boards.getBoard('uno');
options.platform = platform.getDefaultPlatform();
options.platform.installIfNeeded(function() {
    console.log("options = ",options);
    compile.compile(sketchPath,outpath,options, function(res){
        console.log("LOG",res.message);
    }, sketchPath, function() {
        console.log("done with compiling");
    });

    //var port = '/dev/cu.usbmodem1421';
    //uploader.upload('build/out/Blink.hex',port,options);
});
