var fs = require('fs');
var wrench = require('wrench');

var ATOM_PATH = "/Users/josh/Downloads/atom-shell-v0-3/Atom.app";
var BUILD_DIR = 'build_atomshell';

console.log("Making Atom Shell build",ATOM_PATH,BUILD_DIR);


wrench.mkdirSyncRecursive(BUILD_DIR);
wrench.copyDirSyncRecursive(ATOM_PATH,BUILD_DIR+'/Atom.app');

wrench.copyDirSyncRecursive(
    "/Users/josh/projects/ElectronIDE/public",
    "/Users/josh/projects/ElectronIDE/build_atomshell/public",{
        forceDelete:true,
        whitelist:true,
        filter: function(file) {
    //        console.log("checking file",file);
            return true;
        }
});

var pkg = {
  "name"    : "your-app",
  "version" : "0.1.0",
  "main"    : "main.js"
};

fs.writeFileSync('build_atomshell/public/package.json',JSON.stringify(pkg));
fs.writeFileSync('build_atomshell/public/main.js',fs.readFileSync('main.js').toString());
fs.writeFileSync('build_atomshell/public/master.js',fs.readFileSync('master.js').toString());

var ncp = require('ncp').ncp;


ncp(__dirname,"build_atomshell/public", {
    filter: function(file) {
        //console.log("filtering", file);
        if(file == __dirname) return true;
        if(file.indexOf('.') == 0) return false;
        if(file.indexOf(__dirname+'/public') >= 0) return true;

        if(file == __dirname+'/compile.js') return true;
        if(file == __dirname+'/libraries.js') return true;
        if(file == __dirname+'/boards.js') return true;
        if(file == __dirname+'/platform.js') return true;
        if(file == __dirname+'/settings.js') return true;
        if(file == __dirname+'/util.js') return true;
        if(file == __dirname+'/uploader.js') return true;
        if(file == __dirname+'/sketches.js') return true;
        if(file == __dirname+'/serial.js') return true;
        return false;
    }
}, function(err) {
    console.log('cpying is done');
})
