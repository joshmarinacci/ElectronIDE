var fs = require('fs');
var settings = require('./settings.js');

exports.loadBoards = function() {
    console.log("loading boards from ",settings.boardpath);
    var boards = [];
    fs.readdirSync(settings.boardpath).forEach(function(file){
        console.log("parsing board file = ",file);
        var str = fs.readFileSync(settings.boardpath+'/'+file).toString();
        boards.push(JSON.parse(str));
    });
    return boards;
};
