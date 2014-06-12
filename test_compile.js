var compile = require('./compile');
var uploader = require('./uploader');

//compile.compile("test/examples/Blink","build/out");

uploader.upload('build/out/Blink.hex');
