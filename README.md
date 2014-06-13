Electron IDE
=========

New web based Arduino IDE, not affiliated with the official Arduino projects.

Very early stages. Just compilation and basic editing works right now, plus some library stuff You must
be comfortable with the command line right now. All paths are currently
hard coded for Mac.  
To try it out do:

* have NodeJS and NPM installed
* have the regular Arduino IDE installed
* check out the arduino-data project in an adjacent directory.  https://github.com/joshmarinacci/arduino-data
* check out this project. https://github.com/joshmarinacci/ElectronIDE
* install all deps with `npm install`
* modify settings.js to fit your environment
* run `node electron`
* open your browser to `http://localhost:54329/`


## Want to help?

Don't worry. There's *tons* to do.

If you want to help on the Node side, you can work on

* support uploading to Leonardo and related boards using the serial port tricks.
* support proper software reset on Unos (setting DTR high?)
* figure out how to extract documentation from Arduino library source directly (doxygen?)

If you want to help on the HTML side, you can work on

* preferences dialog
* a dialog for managing boards
* a dialog to search and install and query libraries
* design a panel system to manage the sidebars, main editor, tabs, etc.
* pick better defaults
* design a new file picker interface


If you want to help with metadata, you can add:

* new boards to the database
* more extensive board information: number of pins, voltage, diagrams,
* new common libraries to the database
* more extensive lib info, like alternate versions of AccelStepper for other platforms


## Architecture

There are three components.

* The NodeJS side handles actually compiling and uploading sketches,
as well as all on disk tasks like installing libraries and opening sketches.
* The HTML side which is the GUI. The text editor is using [Ace][http://ace.c9.io/#nav=about]
* A metadata repo containing lists of all known boards and libraries, in machine readable form (JSON files).
