var fs = require('fs');
var settings = require('./settings');
var zlib = require('zlib');
var tar = require('tar');
var http = require('http');

//var CLOUDPATH = "/Users/josh/projects/ArduinoZips";
var CLOUDPATH = 'http://joshondesign.com/p/apps/electron/platforms';
var VERSION = "1.0.5";

console.log("os = ",process.platform);

function Platform() {
    this.os = process.platform;

    this.getUserHome = function() {
        return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
    }

    this.getReposPath = function() {
        if(this.os == 'darwin') {
            return this.getUserHome() + '/Library/ElectronIDE/downloads';
        }
        return this.getUserHome() + '/ElectronIDE/downloads';
    }

    this.getUserSketchesDir = function() {
        if(settings.usersketches) return settings.usersketches;

        if(this.os == 'darwin') {
            return this.getUserHome()+'/Documents/Arduino';
        }
        if(this.os == 'win32') {
            return this.getUserHome()+'/My Documents/Arduino';
        }
        return this.getUserHome() + '/Sketchbook';
    }

    this.getUserLibraryDir = function() {
        return this.getUserSketchesDir() + '/libraries';
    }

    this.root = this.getReposPath() + '/platforms/1.0.5/'+this.os;
    //console.log("root should be ", this.root);

    this.getStandardLibraryPath = function() {
        return this.root + '/libraries';
    }
    this.getCorePath = function(device) {
        return this.root + '/hardware/arduino/cores/'+device.build.core;
    }
    this.getVariantPath = function(device) {
        return this.root + '/hardware/arduino/variants/'+device.build.variant;
    }
    this.getCompilerBinaryPath = function(device) {
        return this.root + '/hardware/tools/avr/bin';
    }
    this.getAvrDudeBinary = function(device) {
        if(this.os == 'linux') {
            return this.root + '/hardware/tools/avrdude';
        }
        return this.root + '/hardware/tools/avr/bin/avrdude';
    }
    this.getAvrDudeConf = function(device) {
        if(this.os == 'linux') {
            return this.root + '/hardware/tools/avrdude.conf';
        }
        return this.root + '/hardware/tools/avr/etc/avrdude.conf';
    }
    this.isInstalled = function() {
        return fs.existsSync(this.root);
    }

    this.installIfNeeded = function(cb,update) {
        if(this.isInstalled()) {
            cb();
            return;
        }
        console.log("not installed. installing now");
        var zippath = CLOUDPATH+'/'+VERSION+'/arduino-'+VERSION+'-'+this.os+'-trimmed.tar.gz';
        console.log('zip path = ',zippath);

        var outpath = this.root;
        console.log('unziping to ',outpath);
        var req = http.get(zippath);
        req.on('response', function(res) {
            var total = res.headers['content-length']; //total byte length
            var count = 0;
            res
                .on('data', function(data) {
                    count += data.length;
                    if(update) update( {message:count/total});
                })
                .pipe(zlib.createGunzip())
                .pipe(tar.Extract({path:outpath, strip: 1}))
                .on('error',function() {
                    console.log('there was an error');
                })
                .on('close',function() {
                    console.log('unzipped the files');
                    if(cb) cb();
                });
            });
    }
}
var _default = new Platform();
var _digispark_pro = new Platform();
_digispark_pro.droot = "/Users/josh/projects/Digistump/hardware/digistump/avr";
_digispark_pro.getStandardLibraryPath = function() {   return this.droot + '/libraries';  }
_digispark_pro.getCorePath = function(device) { return this.droot + '/cores/'+device.build.core;   }
_digispark_pro.getVariantPath = function(device) { return this.droot + '/variants/'+device.build.core;   }
_digispark_pro.getAvrDudeBinary = function(device) { return this.droot + '/tools/avrdude'; }

var _trinket3 = new Platform();
_trinket3.hroot = '/Users/josh/Downloads/hardware/attiny';
_trinket3.getVariantPath = function(device) {   return this.hroot + '/variants/' + device.build.variant;  }


exports.getDefaultPlatform = function() {
    console.log('getting the default platform');
    return _default;
}

exports.getPlatform = function(device) {
    console.log(device);
    if(device.id == 'digispark-pro') return _digispark_pro;
    if(device.id == 'digispark') return _digispark_pro;
    if(device.id == 'trinket3') return _trinket3;
    if(device.id == 'trinket5') return _trinket3;
    if(device.id == 'gemma') return _trinket3;
    return _default;
}
