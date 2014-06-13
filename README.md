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
