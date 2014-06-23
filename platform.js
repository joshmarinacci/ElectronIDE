var fs = require('fs');
var settings = require('./settings');
var zlib = require('zlib');
var tar = require('tar');
var http = require('http');

//var CLOUDPATH = "/Users/josh/projects/ArduinoZips";
var CLOUDPATH = 'http://joshondesign.com/p/apps/electron/platforms';
var VERSION = "1.0.5";


function Platform() {
    this.os = process.platform;
    console.log("os = ",this.os);


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
        if(this.os == 'window') {
            return this.getUserHome()+'/My Documents/Arduino';
        }
        return this.getUserHome() + '/Sketchbook';
    }

    this.root = this.getReposPath() + '/platforms/1.0.5/'+this.os;
    console.log("root should be ", this.root);

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
        return this.root + '/hardware/tools/avr/bin/avrdude';
    }
    this.getAvrDudeConf = function(device) {
        return this.root + '/hardware/tools/avr/etc/avrdude.conf';
    }
    this.isInstalled = function() {
        return fs.existsSync(this.root);
    }

    this.installIfNeeded = function(cb) {
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
            res
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

exports.getDefaultPlatform = function() {
    console.log('getting the default platform');
    return _default;
}
