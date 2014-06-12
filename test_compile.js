var fs = require('fs');
var compile = require('./compile');
var uploader = require('./uploader');

var outpath = "build/out";
if(fs.existsSync(outpath)) {
    fs.readdirSync(outpath).forEach(function(file) {
        fs.unlinkSync(outpath+'/'+file);
//        fs.unlink(file);
    })
    fs.rmdirSync(outpath);
}
fs.mkdirSync(outpath);

compile.compile("test/examples/Blink","build/out");

uploader.upload('build/out/Blink.hex');
