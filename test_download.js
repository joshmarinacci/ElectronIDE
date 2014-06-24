var fs = require('fs');
var http = require('http');
var AdmZip = require('adm-zip');


//var src = 'http://www.airspayce.com/mikem/arduino/AccelStepper/AccelStepper-1.41.zip';
var src = 'http://joshondesign.com/p/apps/electron/platforms/1.0.5/arduino-1.0.5-darwin-trimmed.tar.gz';

var outfile = './'+src.substring(src.lastIndexOf('/')+1);
var outdir = 'blah';
console.log('downloading ', src);
console.log("output file = ",outfile);
console.log("outdir = ",outdir);

var req = http.get(src);
req.on('response', function(res) {
    var total = res.headers['content-length']; //total byte length
    var count = 0;
    res
        .on('data', function(data) {
            count+=data.length; // add byte length from this chunk
            console.log( (100*count/total).toFixed(1) + "%");
        })
        .pipe(fs.createWriteStream(outfile))
        .on('close',function(){
            console.log('Success!');
            /*
            var zip = new AdmZip(outfile);
            var zipEntries = zip.getEntries();
            var rootpath = zipEntries[0].entryName;
            rootpath = rootpath.substring(0,rootpath.indexOf('/'));
            zip.extractAllTo(outdir,true);
            console.log("root path = ",rootpath);
            console.log('done extracting from ',outfile);
            */
        });
});
