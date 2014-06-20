Electron IDE
=========

New web based Arduino IDE, not affiliated with the official Arduino projects.

Very early stages. Just compilation and basic editing works right now, plus some library stuff You must
be comfortable with the command line right now. All paths are currently
hard coded for Mac.  
To try it out do:

* have NodeJS and NPM installed
* have the regular Arduino IDE installed
* check out the code: `git clone https://github.com/joshmarinacci/ElectronIDE`
* install all deps with `cd ElectronIDE; npm install`
* modify `settings.js` to fit your environment
* run `node electron`
* open your browser to `http://localhost:54329/`

*A note on Linux*

In theory Electron should *just work* on Linux since it's just javascript underneath.
However, some users have reported that some Linux distros have an existing program
called `node` that is actually an ancient packet radio program.  Try running `node --version`
to make sure you really have NodeJS 10.x and not that other program. Uninstall
it if you do. NodeJS might also be run as `nodejs` instead of `node`.

There are many out of date packages on linux distros. We recommend you use the newest
ones from SID, documented here: http://playground.arduino.cc/Linux/Ubuntu

# What's New?

## Version 0.1 released

I'm happy to announce Electron v0.1. This release has a ton of fixes to the toolchain.
It should support 3rd party libs properly, and has preliminary support for Linux.  I've
also made a bunch of small GUI tweaks and the first attempt at a serial console.


Note that on Linux you should use the arduino-core package provided by your OS, and
make sure that `node --version` returns something valid. You might have another program
called node in it's place.  

For this release please test compiling all of your sketches to see where it breaks.
Undoubtedly we will have more libraries and compiler fixes to add.  File issues on
the github project

https://github.com/joshmarinacci/ElectronIDE

Special thanks to friends of the show Sean McCarthy, HippyJake, and Dean Iverson
for their patches.

Thanks,
    Josh


## Want to help?

Don't worry. There's *tons* to do.

If you want to help on the Node side, you can work on

* support uploading to Leonardo and related boards using the serial port tricks.
* support proper software reset on Unos (setting DTR high?)
* figure out how to extract documentation from Arduino library source directly (doxygen?)
* figure out how to support Windows and Linux (shouldn't be too much)
* look into integrating the embedded webkit from Atom.io
* rewrite the compile system to be properly asynchronous and send feedback to the browser


If you want to help on the HTML side, you can work on

* Build a preferences dialog
* Build a dialog for managing boards
* Build a dialog to search and install and query libraries
* Design a panel system to manage the sidebars, main editor, tabs, etc. something more like XCode
* Pick better defaults for the Ace editor. Syntax highlighting, themes, search, etc.
* Design a new file picker interface. The current one really isn't usable.


If you want to help with metadata, you can add:

* new boards to the database
* more extensive board information: number of pins, voltage, diagrams,
* new common libraries to the database
* more extensive lib info, like alternate versions of AccelStepper for other platforms


And of course everyone can test test test.

## Architecture

There are three components.

* The NodeJS side handles actually compiling and uploading sketches,
as well as all on disk tasks like installing libraries and opening sketches.
* The HTML side which is the GUI. The text editor is using [Ace](http://ace.c9.io/)
* A metadata repo containing lists of all known
boards and libraries, in machine readable form (JSON files).
[repo](https://github.com/joshmarinacci/arduino-data)


----
arch notes:

Platform: a platform is an object that represents the toolchain required to build code for a particular target architecture.
Most arduinos use ATmel chips, so their platform is AVR. Some use ARM variants, so their platform is ARM. Presumably
we will have others in the future. A 'platform' is more than just the chip architecture. Some AVR variants require their
own modifications to the gcc toolchain, so they would be a new platform (perhaps a subclass of the standard one?).  
The platform object will provide paths and other settings to the complier object to correctly build
(compile, link, genenerate hex, etc) a sketch.  Current settings include:
The platform is also in charge of ensuring that the platform actually works, or at the very least that
the required binaries are actually installed where they should be. The platform will have to handle
host OS differences, such as the location of gcc on linux vs mac vs windows. Also the avrdude conf may be
different, or in different places, across host OSes.
