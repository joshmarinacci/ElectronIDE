var ipc = require('ipc');
app.factory('Monitor', ['$rootScope',function($rootScope) {
    /*
        var wsurl = "ws:" + location.hostname + ":4203";
        var monitor = new WebSocket(wsurl);
        monitor.onopen = function(e) {
            console.log("opened the websocket for ", wsurl);
        };
        monitor.onclose = function(e) {
            console.log("closed websocket");
        };
        monitor.onerror = function(e) {
            console.log("error in websocket");
        };
        */

        return {
            on: function(callback) {
                ipc.on('compilewatch',function(arg) {
                    //console.log("compile message");
                    $rootScope.$apply(function() {
                        callback(arg);
                    });
                });
                /*
                monitor.onmessage = function(e) {
                    var event = JSON.parse(e.data);
                    $rootScope.$apply(function() {
                        callback(event);
                    })
                }*/

            }
        }
    }]);
