var fs = require('fs');

function Platform() {
    this.os = process.platform;
    console.log("os = ",this.os);
    if(this.os == 'darwin') {
        this.root = "/Applications/Arduino.app/Contents/Resources/Java";
    }
    if(this.os == 'linux') {
	this.root = '/usr/share/arduino';
    }
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
        if(this.os == 'linux') {
            return '/usr/bin';
        }
        return this.root + '/hardware/tools/avr/bin';
    }
    this.getAvrDudeBinary = function(device) {
        console.log("root = ",this.root);
        return this.root + '/hardware/tools/avr/bin/avrdude';
    }
    this.getAvrDudeConf = function(device) {
        return this.root + '/hardware/tools/avr/etc/avrdude.conf';
    }
}
var _default = new Platform();

exports.getDefaultPlatform = function() {
    console.log('getting the default platform');
    return _default;
}
