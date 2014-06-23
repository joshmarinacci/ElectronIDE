var fs = require('fs');
var http = require('http');
var AdmZip = require('adm-zip');


var src = 'http://www.airspayce.com/mikem/arduino/AccelStepper/AccelStepper-1.41.zip';

var outfile = './'+src.substring(src.lastIndexOf('/')+1);
var outdir = 'blah';
console.log('downloading ', src);
console.log("output file = ",outfile);
console.log("outdir = ",outdir);

var req = http.get(src);
req.on('response', function(res) {
    res.pipe(fs.createWriteStream(outfile)).on('close',function(){
        console.log('its over');
        var zip = new AdmZip(outfile);
        var zipEntries = zip.getEntries();
        var rootpath = zipEntries[0].entryName;
        rootpath = rootpath.substring(0,rootpath.indexOf('/'));
        /*
        zipEntries.forEach(function(zipEntry) {
            console.log(zipEntry.toString()); // outputs zip entries information
        });
        */
        zip.extractAllTo(outdir,true);
        console.log("root path = ",rootpath);
        console.log('done extracting from ',outfile);

        //rename to be lower case
        fs.renameSync(outdir+'/'+rootpath, outdir+'/'+rootpath.toLowerCase());

    });
});
