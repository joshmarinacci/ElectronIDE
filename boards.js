var fs = require('fs');

exports.loadBoards = function() {
    console.log("loading boards");
    var boards = [];
    var datapath = "/Users/josh/projects/arduino-data/boards";
    fs.readdirSync(datapath).forEach(function(file){
        console.log("parsing board file = ",file);
        var str = fs.readFileSync(datapath+'/'+file).toString();
        boards.push(JSON.parse(str));
    });
    return boards;
};
