var platform = require('./platform');

var plat = platform.getDefaultPlatform();

console.log("hoemdir = ",plat.getUserHome());
