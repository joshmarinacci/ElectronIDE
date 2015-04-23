var fs = require('fs');
var http = require('http');
var util = require('./util');
var Q = require('q');

//var CLOUDPATH = "/Users/josh/projects/ArduinoZips";
var CLOUDPATH = 'http://joshondesign.com/p/apps/electron/platforms';
var VERSION = "1.0.5";

//console.log("os = ",process.platform);

var settings = {
    datapath:  __dirname+"/node_modules/arduinodata/libraries",
    boardpath: __dirname+"/node_modules/arduinodata/boards",
    sketchtemplate: "sketchtemplate.ino"
};



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
    this.verifyUserSketchesDir = function() {
        var dir = this.getUserSketchesDir();
        if(!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }
    this.getUserSketchesDir = function() {
        if(settings.user_sketches_dir) return settings.user_sketches_dir;
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
    this.getCorePath = function() {
        return this.root + '/hardware/arduino/cores/'+this.device.build.core;
    }
    this.getVariantPath = function() {
        return this.root + '/hardware/arduino/variants/'+this.device.build.variant;
    }
    this.getCompilerBinaryPath = function() {
        return this.root + '/hardware/tools/avr/bin';
    }
    this.getAvrDudeBinary = function() {
        if(this.os == 'linux') {
            return this.root + '/hardware/tools/avrdude';
        }
        return this.root + '/hardware/tools/avr/bin/avrdude';
    }
    this.getAvrDudeConf = function() {
        if(this.os == 'linux') {
            return this.root + '/hardware/tools/avrdude.conf';
        }
        return this.root + '/hardware/tools/avr/etc/avrdude.conf';
    }
    this.isInstalled = function() {
        console.log("checking this.root",this.root);
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
    this.installIfNeeded_P = function() {
        var self = this;
        return Q.Promise(function(resolve, reject, notify){
           if(self.isInstalled()) return resolve();
            var zippath = CLOUDPATH+'/'+VERSION+'/arduino-'+VERSION+'-'+self.os+'-trimmed.tar.gz';
            util.downloadUntgzTo(zippath,self.root, notify, function(){
                console.log("done with the install");
                resolve();
            });
        });
    }

}


var _default = new Platform();
_default.init = function(device) {
    this.device = device;
    return this;
}

var _digispark_pro = Object.create(_default);
_digispark_pro.init = function(device) {
    var digifix = '/Digistump/hardware/digistump/avr'
    this.id = 'digispark';
    this.device = device;
    this.droot = this.getReposPath() + '/hardware/'+ this.id;
    this.getCorePath = function() { return this.droot + digifix + '/cores/'+this.device.build.core;}
    this.getStandardLibraryPath = function() {   return this.droot + digifix +'/libraries';  }
    this.getVariantPath = function() { return this.droot + digifix+ '/variants/'+this.device.build.core;   }
    this.getAvrDudeBinary = function() { return this.droot + digifix+ '/tools/avrdude'; }
    this.parentPlatform = _default;
    this.isInstalled = function() { console.log("checking",this.droot); return fs.existsSync(this.droot); }
    this.installIfNeeded = function(cb,update) {
        console.log("installing if needed");
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
    return this;
}


var _trinket3 = Object.create(_default);
_trinket3.init = function(device) {
    this.device = device;
    this.id = 'trinket3';
    this.hroot = this.getReposPath() + '/hardware/'+ this.id;
    this.parentPlatform = _default;
    this.getVariantPath = function() {   return this.hroot + '/hardware/attiny/variants/' + this.device.build.variant;  }
    this.isInstalled = function() { return fs.existsSync(this.hroot);  }
    this.installIfNeeded = function(cb,update) {
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

    this.useSerial = function() { return false; }
    this.getAvrDudeConf = function() { return this.hroot + '/avrdude.conf'; }
    this.getProgrammerId = function() { return 'usbtiny'; }
    return this;
}


var _flora = Object.create(_default);
_flora.init = function(device) {
    this.device = device;
    this.id = 'flora';
    this.hroot = this.getReposPath() + '/hardware/' + this.id;
    this.parentPlatform = _default;
    this.getVariantPath = function() {   return this.hroot;  }
    this.isInstalled = function() { return fs.existsSync(this.hroot);  }
    this.installIfNeeded = function(cb,update) {
        var self = this;
        this.parentPlatform.installIfNeeded(function() {
            if(self.isInstalled()) {
                cb();
                return;
            }
            var remote_path = 'http://learn.adafruit.com/system/assets/assets/000/009/337/original/pins_arduino.h';
            var local_path = self.hroot;
            util.downloadTo(remote_path, local_path, 'pins_arduino.h', update, cb);
        },update);
    }
    return this;
}


exports.getDefaultPlatform = function() {
    return _default;
}

exports.getPlatform = function(device) {
    if(device.id == 'digispark-pro') return Object.create(_digispark_pro).init(device);
    if(device.id == 'digispark-tiny') return Object.create(_digispark_pro).init(device);
    if(device.id == 'trinket3') return Object.create(_trinket3).init(device);
    if(device.id == 'trinket5') return Object.create(_trinket3).init(device);
    if(device.id == 'gemma') return Object.create(_trinket3).init(device);
    if(device.id == 'flora') return Object.create(_flora).init(device);
    return Object.create(_default).init(device);
}

exports.getSettings = function() {
    var cln = {};
    for(var name in settings) {
        cln[name] = settings[name];
    }
    cln.user_sketches_dir = exports.getDefaultPlatform().getUserSketchesDir();
    return cln;
}

exports.setSettings = function(newset, cb) {
    console.log("WRITING SETTINGS ",SETTINGS_FILE);
    console.log("new settings = ", newset);
    fs.writeFile(SETTINGS_FILE,JSON.stringify(newset,null,'  '), function(e) {
        console.log("done writing",e);
        settings = newset;
        cb();
    })
}

var SETTINGS_FILE = __dirname+"/settings.json";
exports.loadSettings = function() {
    //console.log("LOADING SETTINGS",SETTINGS_FILE);
    if(!fs.existsSync(SETTINGS_FILE)) return;
    var json = fs.readFileSync(SETTINGS_FILE);
    try {
        var ext_settings = JSON.parse(json);
        //console.log('ext settings = ',ext_settings);
        //console.log("settings",settings);
        for(var name in ext_settings) {
            settings[name] = ext_settings[name];
        }
        //console.log("settings",settings);
    } catch (e) {
        console.log("error loading the settings",e);
    }
}


exports.loadSettings();
