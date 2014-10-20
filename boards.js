var fs = require('fs');
var platform = require('./platform.js');

var boards = [];
function init() {
    var settings = platform.getSettings();
    console.log("loading boards from ",settings.boardpath);
    fs.readdirSync(settings.boardpath).forEach(function(file){
        console.log("parsing board file = ",file);
        var str = fs.readFileSync(settings.boardpath+'/'+file).toString();
        boards.push(JSON.parse(str));
    });
}
init();

exports.loadBoards = function() {
    return boards;
};

exports.getBoard = function(id) {
    for(var i=0; i<boards.length; i++) {
        if(boards[i].id == id) return boards[i];
    }
    return null;
}
