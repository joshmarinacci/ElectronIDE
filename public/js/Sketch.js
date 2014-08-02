app.factory('Sketch', ['$http',function($http) {
    return {
        title:'Sketch',
        status: 'success',
        compile: function(board) {
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
            });
        },
        run: function(serial) {
            console.log("running the sketch with serial port",serial);
        },
        loadSketch: function(file) {
            console.log("loading the sketch",file);
            this.sketchName = file.label;
            $http.get('/sketchfile?id='+file.id).then(function(res) {
                editor.setValue(res.data.content);
                editor.clearSelection();
                editor.gotoLine(0);
                console.log('selection = ', editor.getSelection().getRange());
            })

        }

    }
}]);
