
if(typeof require == 'undefined') {
    console.log("we are in the browser");
    app.factory('AtomShell', ['$rootScope', '$http', function($rootScope, $http) {
        return {
            send: function(command, args, cb) {
                console.log("sending command", command);
                if(command == 'sketches') {
                    $http.get('/'+command).then(function(res) {
                        //self.ports = res.data;
                        console.log('command',command,'returned');
                        cb(res.data);
                    });
                }
                if(command == 'sketch') {
                    $http.get('/'+command+'?id='+args).then(function(res) {
                        //self.ports = res.data;
                        console.log('command',command,'returned');
                        cb(res.data);
                    });
                }

                if(command == 'compile') {
                    console.log("compling",args);
                    $http.post('/'+command,args).then(function(res) {
                        console.log('command',command,'returned',res.data);
                    });
                }
                if(command == 'ports') {
                    $http.get('/'+command).then(function(res) {
                        console.log('command',command,'returned',res.data);
                        cb(res.data);
                    });
                }


            }
        }
    }]);
} else {

    var ipc = require('ipc');

    app.factory('AtomShell', ['$rootScope',function($rootScope) {
        return {
            send: function(command, args, cb) {
                console.log('AtomShell: sending command \'' + command+'\'');
                ipc.send(command, args);
                ipc.on(command, function(arg) {
                    console.log("AtomShell: reply to " + command);
                    console.log(arg);
                    $rootScope.$apply(function() {
                        cb(arg);
                    });
                });
            }
        }
    }]);

}
