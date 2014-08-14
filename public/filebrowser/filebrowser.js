app.controller('FilebrowserCtrl', ['Sketch','$http','$rootScope','AtomShell',
    function(Sketch,$http, $rootScope, AtomShell){
        this.sketches = [];
        var self = this;

        AtomShell.send('sketches',null,function(files) {
            self.sketches = files;
        });
        this.loadFile = function(file) {
            Sketch.loadSketch(file);
        }

        this.toggleNode = function(node) {
            node.closed = !node.closed;
        }
        this.isClosed = function(node) {
            if(node.closed == undefined) {
                node.closed = false;
            }
            return {
                'tree-node-closed':node.closed,
                'tree-node-opened':!node.closed
            }
        }
        this.iconClass = function(node) {
            if(node.closed == undefined) {
                node.closed = false;
            }
            return {
                'uk-icon-caret-right':node.closed,
                'uk-icon-caret-down':!node.closed
            }
        }

    }]);
