var fs = require('fs');

function Platform() {
    this.os = 'macosx';
    this.root = "/Applications/Arduino.app/Contents/Resources/Java";
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
}
var _default = new Platform();

exports.getDefaultPlatform = function() {
    console.log('getting the default platform');
    return _default;
}
