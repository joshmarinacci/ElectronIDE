app.controller('FilebrowserCtrl', ['Sketch','$http','$rootScope','AtomShell','$scope',
    function(Sketch,$http, $rootScope, AtomShell,$scope){
        this.sketches = [];
        this.selectedNode = null;
        var self = this;

        function reloadSketches() {
            AtomShell.send('sketches',null,function(files) {
                self.sketches = files;
            });
        }
        this.loadFile = function(file,node) {
            Sketch.loadSketch(file);
            this.selectedNode = node;
            $rootScope.$broadcast('selectnode',node);
        }

        this.toggleNode = function(node) {
            node.closed = !node.closed;
            this.selectedNode = node;
            $rootScope.$broadcast('selectnode',node);
        }
        this.isClosed = function(node) {
            if(node.closed == undefined) {
                node.closed = false;
            }
            return {
                'tree-node-closed':node.closed,
                'tree-node-opened':!node.closed,
                'selected':this.selectedNode == node,
            }
        }
        this.iconClass = function(node) {
            if(node.closed == undefined) {
                node.closed = false;
            }
            return {
                'uk-icon-caret-right':node.closed,
                'uk-icon-caret-down':!node.closed,
            }
        }


        $scope.$on('newsketch', function(event, name) {
            console.log('new sketch in filebrowser',name);
            reloadSketches();
        });
        $scope.$on('deletesketch', function(event, name) {
            console.log('delete sketch in filebrowser',name);
            reloadSketches();
        });
        reloadSketches();

    }]);
