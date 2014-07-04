var fs = require('fs');
var settings = require('./settings');
var http = require('http');
var util = require('./util');

//var CLOUDPATH = "/Users/josh/projects/ArduinoZips";
var CLOUDPATH = 'http://joshondesign.com/p/apps/electron/platforms';
var VERSION = "1.0.5";

console.log("os = ",process.platform);

function Platform() {
    this.os = process.platform;

    this.useSerial = function() {
        return true;
    }
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
        var zippath = CLOUDPATH+'/'+VERSION+'/arduino-'+VERSION+'-'+this.os+'-trimmed.tar.gz';
        util.downloadUntgzTo(zippath,this.root,update, cb);
    }
}
var _default = new Platform();
var _digispark_pro = new Platform();
_digispark_pro.id = 'digispark';
var digifix = '/Digistump/hardware/digistump/avr'
_digispark_pro.droot = _digispark_pro.getReposPath() + '/hardware/'+_digispark_pro.id;
_digispark_pro.getStandardLibraryPath = function() {   return this.droot + digifix +'/libraries';  }
_digispark_pro.getCorePath = function(device) { return this.droot + digifix + '/cores/'+device.build.core;   }
_digispark_pro.getVariantPath = function(device) { return this.droot + digifix+ '/variants/'+device.build.core;   }
_digispark_pro.getAvrDudeBinary = function(device) { return this.droot + digifix+ '/tools/avrdude'; }
_digispark_pro.parentPlatform = _default;
_digispark_pro.isInstalled = function() { return fs.existsSync(this.droot);  }
_digispark_pro.installIfNeeded = function(cb,update) {
    var self = this;
    this.parentPlatform.installIfNeeded(function() {
        if(self.isInstalled()) {
            cb();
            return;
        }
        var zippath = 'unknown path';
        if(self.os == 'darwin') {
            zippath = 'http://digispark.s3.amazonaws.com/digisparkpro_mac.zip';
        }
        if(self.os == 'linux') {
            zippath = 'http://digispark.s3.amazonaws.com/digisparkpro_linux.zip';
        }
        if(self.os == 'win32') {
            zippath = 'http://sourceforge.net/projects/digistump/files/Digistump1.5Addons-v09.zip/download';
        }
        var path = self.droot;
        util.downloadUnzipTo(zippath,path,update, cb);
    },update);
}


var _trinket3 = new Platform();
_trinket3.id = 'trinket3';
_trinket3.hroot = _trinket3.getReposPath() + '/hardware/'+_trinket3.id;

_trinket3.parentPlatform = _default;
_trinket3.getVariantPath = function(device) {   return this.hroot + '/hardware/attiny/variants/' + device.build.variant;  }
_trinket3.isInstalled = function() { return fs.existsSync(this.hroot);  }

_trinket3.installIfNeeded = function(cb,update) {
    var self = this;
    this.parentPlatform.installIfNeeded(function() {
        if(self.isInstalled()) {
            cb();
            return;
        }
        var zippath = 'http://learn.adafruit.com/system/assets/assets/000/010/777/original/trinkethardwaresupport.zip?1378321062';
        var path = self.hroot;
        util.downloadUnzipTo(zippath,path,update, function() {
            var confpath = 'http://learn.adafruit.com/system/assets/assets/000/010/980/original/avrdudeconfmac.zip?1379342581';
            util.downloadUnzipTo(confpath,path, update, cb);
        });
    },update);
}
_trinket3.useSerial = function() { return false; }
_trinket3.getAvrDudeConf = function(device) { return this.hroot + '/avrdude.conf'; }
_trinket3.getProgrammerId = function() { return 'usbtiny'; }

exports.getDefaultPlatform = function() {
    return _default;
}

exports.getPlatform = function(device) {
    if(device.id == 'digispark-pro') return _digispark_pro;
    if(device.id == 'digispark-tiny') return _digispark_pro;
    if(device.id == 'trinket3') return _trinket3;
    if(device.id == 'trinket5') return _trinket3;
    if(device.id == 'gemma') return _trinket3;
    return _default;
}
