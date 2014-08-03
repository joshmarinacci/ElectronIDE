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
it if you do. NodeJS might also be run as `nodejs` instead of `node`. On Ubuntu 14.04
we have reports that the `nodejs-legacy` package can successfully run Electron.



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

* support proper software reset on Unos (setting DTR high?)
* figure out how to extract documentation from Arduino library source directly (doxygen?)
* look into integrating the embedded webkit from Atom.io (Atom-Shell)

If you want to help on the HTML side, you can work on

* Pick better defaults for the Ace editor. Syntax highlighting, themes, search, etc.

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



### Roadmap


* v0.1  work on the build toolchain. work on linux. properly async. autoinstall libs recursively.
* v0.2  switch to downloading platform toolchains on demand from git repos. support linux and windows fully.
* v0.3  work on new gui: better filepicker, library picker, serial port auto-connect,
* v0.4  support RFDuino, Teensyduino, Trinket, other alt-platforms.

future features

* firmata console
* code completion
* measurement console


----
arch notes:



platform design:

Phe platform abstraction encompasses both the host operating system and the target
platform. The target platform is larger than just a board. It is the
architecture and surrounding details. Initally we have one platform: AVR.  
With the Due we have two AVR and SAM, which is ARM based.  Some Arduino
derivatives are based on the AVR or ARM platforms, but have their own
variations that we must account for.  This may involve adding extra files,
or modifying existing ones, or modifying the upload process.  So, all of this
needs to be accounted for in the ‘platform’ abstraction. that’s a tall order.

Since we probably won’t get it right the first time, the platform
abstraction will be internal initially. It will not be in the arduino-data
repo. updating the platforms will require updating the IDE.

A key feature of platforms is that they can be downloaded on demand, and only
the parts needed for the target host are required. Eventually they will be
fully versioned as well, but until we find definitive sources and version
information, it will just come from static zips that I host.


The official Arduino IDE consists of the following parts:


* exe, not needed for us
* drivers, for now we assume that the user has installed drivers already. really only needed on windows.
* examples,  we don’t include example code yet, so don’t worry about it.
* hardware:
  * arduino: board defs, boot loaders, cores, variants. basically a bunch of hex files and C++ code
  * tools: the AVR toolchain
* java: the core of the IDE. we don’t use it.
* lib: support libs for the java IDE. don’t need
* libraries: source for the standard arduino libs. we *do* need theses
* reference: copy of the web HTML docs. we aren’t doing docs yet, so don’t need it.
* tools: a java based code mangler. I don’t think we need it.


This means we really just need the hardware dir and the libraries dir.
Everything else can go. While there is some shared between platforms,
(like the libraries dir) for now it will be just one big zip that gets downloaded.
