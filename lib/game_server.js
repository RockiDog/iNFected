var socketio = require('socket.io')
var mongojs  = require('mongojs')
var io       = null

// TODO The collection 'profiles' to be updated
exports.listen = function(server) {
  io = socketio.listen(server)
  io.set('log level', 1)
  io.sockets.on('connection', function(socket) {
    socket.on('disconnect', function() {
      online.pop(uname)
      console.log('User ' + uname + ' is offline')
    })
  })
}
