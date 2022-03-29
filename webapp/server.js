const express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname+'/src/'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

// Access the parse results as request.body
app.post('/', function(request, response){
    if ('tapkey' in request.body){
      // console.log(request.body.tapid);
      io.emit('tap data', {
        keycode: request.body.tapkey,
        deviceid: request.body.tapid
      });
    }
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});

//socket io stuffs
io.on('connection', (socket) => {
  console.log("client connected")
  // from the tap connector python
  socket.on("tapcode", data => {
    io.emit('tap data', {
      keycode: data.tapkey,
      deviceid: data.tapid
    });
  })


  //from the front end webpage
  socket.on("decode request", data => {
    io.emit("decode request", data)
  })

  //from the python decoder
  socket.on("decode result", data => {
    io.emit("decode result", data)
  })

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    console.log("client disconnected")
  });
});