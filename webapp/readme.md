# TypeAnywhere Web Application
Have your TAP device ready! You also need to install the [TapWithUS-python SDK](https://github.com/TapWithUs/tap-python-sdk) in order to run the python file.

### Run the receiver of the tap device:
`python tap_device_receiver.py`

### Then run the webpage:
`node server.js` (you may want to install *yarn* first and then do `yarn install`)

(the server will communicate with the python receiver through socket.io) and then go to localhost:3000

### To change the finger positioning
modify the `strToCode` and `loadDictionary` functions in the index.js
- dict.json: standard
- dict_chris.json: left-middle: [ed], left-index: [*c*rfvtg], right-index: [ujmyhn*b*]
- dict_olp.json: right-ring: [*p*ol], right-pinky: [p]
- dict_cbp.json: left-middle: [ed], left-index: [*c*rfvtg], right-index: [ujmyhn*b*], right-ring: [*p*ol], no right-pinky
