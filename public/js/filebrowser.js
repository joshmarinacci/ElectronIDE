app.controller('FilebrowserCtrl', ['Sketch','$http',function(Sketch,$http){
        this.sketches = [];
        var self = this;
        $http.get('/sketchtree').then(function(res) {
            self.sketches = res.data;
        });
        this.loadFile = function(file) {
            Sketch.loadSketch(file);
        }
    }]);
