var ipc = require('ipc');

app.factory('AtomShell', ['$rootScope',function($rootScope) {
    return {
        send: function(command, args, cb) {
            //console.log('AtomShell: sending' + command);
            ipc.send(command, args);
            ipc.on(command, function(arg) {
                //console.log("AtomShell: reply");
                $rootScope.$apply(function() {
                    cb(arg);
                });
            });
        }
    }
}]);
