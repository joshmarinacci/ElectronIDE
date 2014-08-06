app.factory('Sketch', ['$http',function($http) {
    return {
        title:'Sketch',
        status: 'success',
        files:[],
        listeners:[],
        compile: function(board, cb) {
            console.log("board = ",board);
            var self = this;
            var name = this.sketchName;
            if(name.indexOf('.')>=0) {
                name = name.substring(0,name.lastIndexOf('.'));
            }
            console.log('compiling the sketch',name);
            $http.post('/compile',{
                code: editor.getValue(),
                board: board.id,
                sketch:name,
            }).then(function(res) {
                console.log("the response is",res.data.status);
                self.status = res.data.status;
                if(cb) cb(res.data);
            });
        },
        run: function(serial, board, cb) {
            console.log("running the sketch with serial port",serial);
            var name = this.sketchName;
            if(name.indexOf('.')>=0) {
                name = name.substring(0,name.lastIndexOf('.'));
            }
            console.log('compiling the sketch',name);
            $http.post('/run',{
                code: editor.getValue(),
                board: board.id,
                sketch:name,
                port: serial.comName,
            }).then(function(res) {
                console.log("the response is",res.data.status);
                self.status = res.data.status;
                if(cb) cb(res.data);
            });
        },
        loadSketch: function(file) {
            console.log("loading the sketch",file);
            var self = this;
            $http.get('/sketch?id='+file.id).then(function(res) {
                console.log("got result",res.data);
                self.files = res.data.files;
                self.sketchName = res.data.name;
                self.listeners.forEach(function(l) {
                    l();
                })
            })

        }

    }
}]);
