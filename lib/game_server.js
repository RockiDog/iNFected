var socketio     = require('socket.io')
var io           = null
var globalSpores = new Object
var online       = new Array

// TODO The collection 'profiles' to be updated
exports.listen = function(server) {
  io = socketio.listen(server)
  io.set('log level', 1)

  io.on('connection', function(socket) {
    var user = new Object
    var maxSporeID = new Number
    
    socket.on('user', function(uname)) {
      user.uname = uname
      online.push(uname)
      db.profiles.findOne({uname : uname}, function(err, doc) {
        user.killed = doc.killed
        user.dead   = doc.dead
        user.online = true
        user.position = doc.position
        user.root = doc.root
        user.spores = doc.spore
        globalSpores[user.uname] = user.spores
        if (user.spores.length != 0)
          socket.emit('addspores', {owner : user.name, all : user.spores})
        maxSporeID = user.spores.length
      })
    }
    
    socket.on('addspore', function(position) {
      var spore = {
        id     : maxSporeID++,
        lng    : position.lng,
        lat    : position.lat,
        radius : 20
      }
      globalSpores[user.uname][spore.id] = spore
      io.sockets.emit('addspores', {owner : user.uname, all : [spore]})
    })
    
    socket.on('removespore', function(spores)) {
      for (var spore in spores.all)
        globalSpores[spores.owner][spore.id] = null
      io.sockets.emit('removespores', spores)
    }
    
    socket.on('postition', function(position) {
    })
    
    socket.on('disconnect', function() {
    })
  })
}
