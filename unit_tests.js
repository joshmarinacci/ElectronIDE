var sketches = require('./sketches');


sketches.makeNewSketch('foo',function(path){
    console.log("made the sketch",path);
    sketches.deleteSketch('foo',function(path) {
        console.log("deleted",path);
        sketches.listSketches(function(list) {
            console.log("all sketches",list);

            sketches.getSketch('Blink',function(sk) {
                console.log("blink sketch = ",sk);
            })
        });
    });
});
