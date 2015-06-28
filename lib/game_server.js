var db           = null
var globalSpores = new Object
var io           = null
var mongojs      = require('mongojs')
var online       = new Array
var socketio     = require('socket.io')

function Rad(d) {
  return d * Math.PI / 180.0
}

function getDistance(pointA, pointB) {
  var radLatA = Rad(pointA.lat)
  var radLatB = Rad(pointB.lat)
  var a = radLatA - radLatB
  var b = Rad(pointA.lng) - Rad(pointB.lng)
  var s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a/2), 2)
        + Math.cos(radLatA)*Math.cos(radLatB)*Math.pow(Math.sin(b/2), 2)))
  s = s * 6378.137
  s = Math.round(s * 10000) / 10
  return s
}

// TODO The collection 'profiles' to be updated
exports.listen = function(server) {
  db = mongojs('mongodb://soap:5102paoS@localhost:27017/infecteddb', ['profiles'])
  io = socketio.listen(server)
  io.set('log level', 1)

  io.on('connection', function(socket) {
    var user = new Object
    var maxSporeID = new Number
    
    socket.on('signup', function(info) {
      online.push(uname)
      user.uname  = info.uname
      user.killed = false
      user.dead   = false
      user.online = true
      user.position = info.pos
      user.root     = info.pos
      user.spores = new Array
      db.profiles.save(user, function(err, saved) {
        globalSpores[user.uname] = user.spores
        maxSporeID = 0
      })
    })
    
    socket.on('signin', function(uname) {
      user.uname = uname
      online.push(uname)
      db.profiles.findOne({uname : uname}, function(err, doc) {
        user.killed = doc.killed
        user.dead   = doc.dead
        user.online = true
        user.position = doc.position
        user.root     = doc.root
        user.spores = doc.spore
        globalSpores[user.uname] = user.spores
        maxSporeID = user.spores.length
      })
    })
    
    socket.on('addspore', function(position) {
      var spore = {
        id     : maxSporeID++,
        lat    : position.lat,
        lng    : position.lng,
        radius : 30
      }
      globalSpores[user.uname][spore.id] = spore
      io.sockets.emit('addspores', {owner : user.uname, all : [spore]})
      console.log(globalSpores)
    })
    
    socket.on('removespore', function(spores) {
      for (var i in spores.all) {
        var spore = spores.all[i]
        globalSpores[spores.owner][spore.id] = null
      }
      io.sockets.emit('removespores', spores)
      console.log(globalSpores)
    })
    
    socket.on('position', function(position) {
      
      /* My spores */
      var spores = {
        owner : user.uname,
        all   : globalSpores[user.uname]
      }
      socket.emit('mergespores', spores)
      
      /* Other spores */
      adjacent = new Array
      for (var other in globalSpores) {
        if (other.uname == user.uname)
          continue
        for (var id in globalSpores[other.uname]) {
          var spore = globalSpores[other.name][id]
          var dist = getDistance({lat : position.lat, lng : position.lng}, {lat : spore.lat, lng : spore.lng})
          if (dist < spore.radius)
            adjacent.push(spore)
        }
        if (adjacent.length != 0) {
          var spores = {
            owner : other.uname,
            all   : adjacent
          }
          socket.emit('mergespores', spores)
        }
      }
    })
    
    socket.on('disconnect', function() {
      var spores = new Array
      var count = 0
      for (var id in globalSpores[user.uname]) {
        var spore = globalSpores[user.uname][id]
        spores.push({
          id     : count++,
          lat    : spore.lat,
          lng    : spore.lng,
          radius : spore.radius
        })
      }
      db.profiles.update({uname : user.uname}, {$set : {
            online : false,
            position : user.position,
            spore : spores
      }})
    })
  })
}
