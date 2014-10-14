app.factory('Sketch', ['$http','AtomShell',function($http,AtomShell) {
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
            AtomShell.send('compile',{
                code: editor.getValue(),
                board: board.id,
                sketch:name,
            },function(data) {
                self.status = data.status;
                if(cb) cb(data);
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
            AtomShell.send('sketch',file.id, function(data) {
                self.files = data.files;
                self.sketchName = data.name;
                self.listeners.forEach(function(l) {
                    l();
                })
            });
        },
        saveSketch: function(file) {
            console.log('saving the sketch file',file);
            AtomShell.send('save',{
                code:editor.getValue(),
                file:file,
            },function(data) {
                console.log("got back from saving");
            })
        }

    }
}]);
