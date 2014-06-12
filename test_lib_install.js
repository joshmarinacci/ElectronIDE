var libs = require('./libraries').loadLibraries();

//is lib installed
//install lib
//get compile paths
//get include paths
//get list of examples
//search for library, score name highest, then tags, then

//console.log("libs",libs);

console.log("searching for the wire lib by name");
libs.search("wire",function(results) {
    console.log("returned",results);
});

console.log("getting the wire lib exactly");
var lib = libs.getById('wire');
console.log(lib);
console.log("is installed",lib.isInstalled());
console.log("installing");
lib.install();
console.log("is installed",lib.isInstalled());



console.log("searching for the NESPad lib by tag 'input'");
libs.search('input',function(results){
    console.log("returned",results);
});

var lib = libs.getById('nespad');
console.log("nes installed?",lib.isInstalled());
if(!lib.isInstalled()) {
    lib.install(function(status) {
        console.log("now it should be installed");
        console.log("nes installed?",lib.isInstalled());
    });
}
