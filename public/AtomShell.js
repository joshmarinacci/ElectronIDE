

if(typeof require == 'undefined') {
    console.log("we are in the browser");
    app.factory('AtomShell', ['$rootScope', '$http', function($rootScope, $http) {

        function doPost(command, args, cb) {
            console.log("really sending", command);
            $http.post('/'+command,args).then(function(res) {
                console.log('command',command,'returned',res.data);
                cb(res.data);
            });
        }

        return {
            send: function(command, args, cb) {
                console.log("sendings command", command);
                if(command == 'sketches') {
                    $http.get('/'+command).then(function(res) {
                        //self.ports = res.data;
                        console.log('command',command,'returned');
                        cb(res.data);
                    });
                    return;
                }
                if(command == 'sketch') {
                    $http.get('/'+command+'?id='+args).then(function(res) {
                        //self.ports = res.data;
                        console.log('command',command,'returned');
                        cb(res.data);
                    });
                    return;
                }
                if(command == 'sketches_new' || command == 'sketches_delete') {
                    doPost(command,args,cb);
                    return;
                }

                if(command == 'compile') {
                    console.log("compling",args);
                    $http.post('/'+command,args).then(function(res) {
                        console.log('command',command,'returned',res.data);
                        cb(res.data);
                    });
                    return;
                }
                if(command == 'ports') {
                    $http.get('/'+command).then(function(res) {
                        console.log('command',command,'returned',res.data);
                        cb(res.data);
                    });
                    return;
                }
                doPost(command, args, cb);
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
