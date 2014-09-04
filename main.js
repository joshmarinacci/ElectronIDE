var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.
var master = require('./master');

//var JoshModule = require('./JoshModule');
//console.log("server side JoshModule = ", JoshModule);
// Report crashes to our server.
require('crash-reporter').start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  if (process.platform != 'darwin')
    app.quit();
});

// This method will be called when atom-shell has done everything
// initialization and ready for creating browser windows.
app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1024, height: 768});

  // and load the index.html of the app.
  mainWindow.loadUrl('file://' + __dirname + '/index.html');

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });


    var ipc = require('ipc');

    ipc.on('sketches', function(event, arg) {
      master.listSketches(function(list) {
          event.sender.send('sketches',list);
      });
    });

    ipc.on('sketch', function(event, id) {
      var path = id.substring(0,id.lastIndexOf('/'));
      master.getSketch(path,function(list) {
          console.log('the list is');
          event.sender.send('sketch',list);
      });
    });

    ipc.on('ports', function(event, arg) {
        master.listPorts(function(err,list) {
            event.sender.send('ports',list);
        })
    })

    ipc.on('compile', function(event, arg) {
        var req = {};
        req.body = arg;
        function publishEvent(e) {
            mainWindow.webContents.send('compilewatch',e);
        }
        if(!req.body.board) return event.sender.send('compile',{status:'missing board name'});
        try {
            master.doCompile(req.body.code, req.body.board, req.body.sketch, function(err) {
                if(err) return event.sender.send({status:'error',message:err});
                event.sender.send('compile',{status:'okay'});
            }, publishEvent);

        } catch(e) {
            console.log("compilation error",e);
            console.log(e.output);
            publishEvent({ type:'error', message: e.toString(), output: e.output});
            event.sender.send('compile',{status:'error',output:e.output, message: e.toString()});
        }

    })

    ipc.on('search', function(event, query) {
        master.searchLibraries(query, function(results) {
            event.sender.send('search',results);
        });
    });

    ipc.on('boards', function(event) {
        event.sender.send('boards',master.getBoards());
    });
});
