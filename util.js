var http = require('http');
var fs = require('fs');
var AdmZip = require('adm-zip');
var zlib = require('zlib');
var tar = require('tar');
var wrench = require('wrench');

exports.downloadUnzipTo = function (remote, outpath, update, cb) {
    console.log('downloading ',remote);
    var self = this;
    console.log('unziping to ',outpath);
    var req = http.get(remote);
    var fout = fs.createWriteStream('/tmp/blah.zip');
    req.on('response', function(res) {
        var total = res.headers['content-length']; //total byte length
        var count = 0;
        res
            .on('data', function(data) {
                count += data.length;
                if(update) update( {message:count/total});
            })
            .pipe(fout)
            .on('error',function(err) {
                console.log('there was an error');
                if(cb) cb(new Error(""+err));
            })
            .on('close',function() {
                console.log('unzipped the files');
                var zip = new AdmZip('/tmp/blah.zip');
                zip.extractAllTo(outpath,true);
                if(cb) cb();
            });
        });
}

exports.downloadUntgzTo = function (remote, outpath, update, cb) {
    console.log('downloading ',remote);
    var self = this;
    console.log('unziping to ',outpath);
    var req = http.get(remote);
    var fout = fs.createWriteStream('/tmp/blah.zip');
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
            .on('error',function(err) {
                console.log('there was an error');
                if(cb) cb(new Error(""+err));
            })
            .on('close',function() {
                console.log('unzipped the files');
                if(cb) cb();
            });
        });
}

exports.downloadTo = function (remote, outpath, filename, update, cb) {
    console.log('downloading ',remote);
    var self = this;
    console.log('unziping to ',outpath);
    var req = http.get(remote);
    wrench.mkdirSyncRecursive(outpath);
    var fout = fs.createWriteStream(outpath + '/' + filename);
    req.on('response', function(res) {
        var total = res.headers['content-length']; //total byte length
        var count = 0;
        res
            .on('data', function(data) {
                count += data.length;
                if(update) update( {message:count/total});
            })
            .pipe(fout)
            .on('error',function(err) {
                console.log('there was an error');
                if(cb) cb(new Error(""+err));
            })
            .on('close',function() {
                console.log('downloaded the file');
                if(cb) cb();
            });
        });
}
