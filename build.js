var fs = require('fs');
var wrench = require('wrench');
var ncp = require('ncp').ncp;

/*
 run app with
 build/mac/Atom.app/Contents/MacOS/Atom build/mac/Atom.app/Contents/Resources/app

cd ~/projects/ElectronIDE/build/mac/Atom.app/Contents/Resources/app


run app with
Atom.exe Resources/applicationcd npm


this should work. need 11.13
rm -rf node_modules/serialport
npm install --dd --target='0.11.13' --msvs_version=2010
--disturl=https://gh-contractor-zcbenz.s3.amazonaws.com/atom-shell/dist
--arch=ia32 --target_arch=ia32

windows
npm install --dd --target='0.11.13' --msvs_version=2010 --disturl=https://gh-contractor-zcbenz.s3.amazonaws.com/atom-shell/dist --arch=ia32 --target_arch=ia32

mac
npm install --dd --target='0.11.13' --msvs_version=2013 --disturl=https://gh-contractor-zcbenz.s3.amazonaws.com/atom-shell/dist --arch=x64 --target_arch=x64

must have real node 0.11.13 installed.
must use
*/


if(!fs.existsSync('build')) fs.mkdirSync('build');

var atom_to_node_versions = {
    'v0.13.3':'0.11.10',
    'v0.16.3':'0.11.13',
    'v0.17.0':'0.11.14',
    'v0.17.1':'0.11.14', // ????
    'v0.17.2':'0.11.14',
    'v0.18.1':'0.11.14',
}

//var ATOM_VERSION = 'v0.13.3';
var ATOM_VERSION = 'v0.17.1';
var ATOM_VERSION = 'v0.18.1';
var ATOM_VERSION = 'v0.16.3';

console.log("node is ",process.version);

var atom_node = atom_to_node_versions[ATOM_VERSION];
var build_node = process.versions.node;
console.log("node version we will run under",atom_node);
console.log("current node version = ",build_node);
if(atom_node != build_node) {
    console.log("WARNING! This wont work. build node doesn't match atom node");
    return;
}



    //var APP_DIR   = BUILD_DIR+'/'+RESOURCES_DIR;
    /*
var appdir = 'build/win32/resources/app';
console.log("app dir = ", appdir);
installDeps(appdir,function() {
        console.log("done with deps");
});
return;
*/


/*buildapp(
    "../atomshell/"+ATOM_VERSION+"/win32",
    'build/win32',
    '/resources/app',
    function() {
        console.log("done with win 32")
    }
);
return;
*/

/*


buildapp(
    "/Users/josh/projects/atomshell/v0.15.4/linux32",
    'build/linux32',
    '/resources/app',
    function() {
        console.log("done with linux 32");
    }
);

return;
*/

buildapp(
    "/Users/josh/projects/atomshell/"+ATOM_VERSION+"/mac",
    'build/mac',
    '/Atom.app/Contents/Resources/app',
    function() {
        console.log("done with mac. doing next");
    }
);


function buildapp(ATOM_PATH, BUILD_DIR, RESOURCES_DIR, cb) {
    console.log("Making Atom Shell build",ATOM_PATH,BUILD_DIR);
    if(!fs.existsSync(ATOM_PATH)) throw new Error("Path missing " + ATOM_PATH);
    var APP_DIR   = BUILD_DIR+'/'+RESOURCES_DIR;
    console.log("app dir = ", APP_DIR);

    console.log("making ",BUILD_DIR)
    if(fs.exists(BUILD_DIR))  wrench.rmdirSyncRecursive(BUILD_DIR);
    wrench.mkdirSyncRecursive(BUILD_DIR);
    console.log("copying", ATOM_PATH);
    wrench.copyDirSyncRecursive(ATOM_PATH,BUILD_DIR);


    //copy atom shell
    ncp(ATOM_PATH,BUILD_DIR, function() {
        console.log("making",APP_DIR);
        if(!fs.existsSync(APP_DIR)) wrench.mkdirSyncRecursive(APP_DIR);
        //copy public files
        console.log("copying to ",APP_DIR);
        ncp(__dirname+'/public', APP_DIR, function() {
            console.log("done copying");
            buildPackageJson(function() {
                console.log("with with json");
                copyServer(function() {
                    console.log("with with copying server files");
                    installDeps(APP_DIR, function() {
                        console.log("done with deps");
                        if(cb) cb();
                    });
                })
            });
        });

    });



    return;
    /*
    wrench.copyDirSyncRecursive(
        "/Users/josh/projects/ElectronIDE/public",
        APP_DIR,{
            //forceDelete:true,
            whitelist:true,
            filter: function(file) {
        //        console.log("checking file",file);
                return true;
            }
    });
    */

function buildPackageJson(cb) {
    var pkg = {
      "name"    : "Electron",
      "version" : "0.1.0",
      "main"    : "main.js",
      "dependencies": {
        "adm-zip": "^0.4.4",
        "arduinodata": ">=0.1.0",
        "async": "^0.9.0",
        "express": "^4.4.2",
        "moment": "^2.6.0",
        "multer": "^0.1.0",
        "nodejs-websocket": "^0.1.5",
        "tar": "^0.1.19",
        "unzip": "^0.1.9",
        "wrench": "^1.5.8",
        "body-parser": "^1.5.2",
        "serialport": "^1.4.6", //pin serialport version for atom compatibility
        "ncp": "~0.6.0"
      }
    };

    console.log("writing to "+APP_DIR+'/package.json');
    fs.writeFileSync(APP_DIR+'/package.json',JSON.stringify(pkg,null,'  '));
    if(cb) cb();
}



function copyServer(cb) {
    //copy the javascript parts for the server
    ncp(__dirname,APP_DIR, {
        filter: function(file) {
            //console.log("filtering", file);
            if(file == __dirname) return true;
            if(file.indexOf('.') == 0) return false;
            if(file.indexOf(__dirname+'/public') >= 0) return true;

            if(file == __dirname+'/main.js') return true;
            if(file == __dirname+'/master.js') return true;
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
    }, cb);
}



}


function installDeps(APP_DIR, cb) {
    console.log("installing deps");
    var args = [
        'install',
        "--dd",
        "--target=0.11.13",
        //"--msvs_version=2010",
        "--disturl=https://gh-contractor-zcbenz.s3.amazonaws.com/atom-shell/dist",
        //"--arch=ia32",
        //"--target_arch=ia32",
        "--arch=x64",
        "--target_arch=x64",
    ];
    var bin = 'npm';
    //var bin = 'C:\\Program Files\\nodejs\\npm.cmd';
    console.log("NPM exists",fs.existsSync(bin));
    var ch = require('child_process').spawn(bin,args, {  cwd: APP_DIR });
    ch.stdout.pipe(process.stdout);
    ch.stderr.pipe(process.stderr);
    ch.on('error', function(err) {
        console.log(err);
    })
    /*
    ch.stdout.on('data',function(data) {
        console.log("STDOUT",data.toString());
    });
    *//*
    ch.stderr.on('data',function(data) {
        console.log("STDERR",data.toString());
    });
    */
    ch.on('close', function (code) {
        console.log('child process exited with code ' + code);
        if(cb)cb();
    });
}
