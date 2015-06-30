var db           = null
var globalSpores = new Object
var io           = null
var mongojs      = require('mongojs')
var online       = new Array
var socketio     = require('socket.io')

var DEFAUTL_RADIUS = 30
var INCREMENT_RADIUS = 10
var MIN_INFECT_DIST = 100

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

exports.listen = function(server) {
  db = mongojs('mongodb://soap:5102paoS@localhost:27017/infecteddb', ['profiles'])
  io = socketio.listen(server)
  io.set('log level', 1)

  io.on('connection', function(socket) {
    var user = new Object
    var maxSporeID = 0
    
    socket.on('signup', function(info) {
      user.uname  = info.uname
      online.push(user.uname)
      user.killed = false
      user.dead   = false
      user.position = info.pos
      user.spores = new Array
      db.profiles.save(user, function(err, saved) {
        globalSpores[user.uname] = user.spores
        maxSporeID = 0
      })
      setInterval(function() {
        for (var id in globalSpores[user.uname]) {
          var mySpore = globalSpores[user.uname][id]
          var isolated = true
          for (var otherName in globalSpores) {
            for (var otherId in globalSpores[otherName]) {
              if (user.uname != otherName || id != otherId) {
                var otherSpore = globalSpores[otherName][otherId]
                var dist = getDistance({lat : mySpore.lat, lng : mySpore.lng}, {lat : otherSpore.lat, lng : otherSpore.lng})
                if (dist + INCREMENT_RADIUS < mySpore.radius + otherSpore.radius) {
                  isolated = false
                  break;
                }
              }
            }
            if (isolated == false)
              break;
          }
          if (isolated == true) {
            mySpore.radius += INCREMENT_RADIUS
          }
        }
      }, 10000)
    })
    
    socket.on('signin', function(name) {
      user.uname = name
      online.push(name)
      db.profiles.findOne({uname : name}, function(err, doc) {
        user.killed = doc.killed
        user.dead   = doc.dead
        user.position = doc.position
        user.spores = doc.spores
        globalSpores[user.uname] = user.spores
        maxSporeID = user.spores.length
        setInterval(function() {
          for (var id in globalSpores[user.uname]) {
            var mySpore = globalSpores[user.uname][id]
            var isolated = true
            for (var otherName in globalSpores) {
              for (var otherId in globalSpores[otherName]) {
                if (user.uname != otherName || id != otherId) {
                  var otherSpore = globalSpores[otherName][otherId]
                  var dist = getDistance({lat : mySpore.lat, lng : mySpore.lng}, {lat : otherSpore.lat, lng : otherSpore.lng})
                  if (dist + INCREMENT_RADIUS < mySpore.radius + otherSpore.radius) {
                    isolated = false
                    break;
                  }
                }
              }
              if (isolated == false)
                break;
            }
            if (isolated == true) {
              mySpore.radius += INCREMENT_RADIUS
            }
          }
        }, 10000)
      })
    })
    
    socket.on('addspore', function(position) {
      var d = getDistance({lat : position.lat, lng : position.lng}, {lat : user.position.lat, lng : user.position.lng})
      if (d > MIN_INFECT_DIST)
        return
      for (var name in globalSpores) {
        for (var id in globalSpores[name]) {
          var spore = globalSpores[name][id]
          var dist = getDistance({lat : position.lat, lng : position.lng}, {lat : spore.lat, lng : spore.lng})
          if (dist < spore.radius + DEFAUTL_RADIUS)
            return
        }
      }
      
      var spore = {
        id     : maxSporeID++,
        lat    : position.lat,
        lng    : position.lng,
        radius : DEFAUTL_RADIUS
      }
      globalSpores[user.uname][spore.id] = spore
      io.sockets.emit('addspores', {owner : user.uname, all : [spore]})
    })
    
    socket.on('removespore', function(spores) {
      for (var i in spores.all) {
        var spore = spores.all[i]
        delete globalSpores[spores.owner][spore.id]
      }
      io.sockets.emit('removespores', spores)
    })
    
    socket.on('position', function(position) {
      user.position = position
      
      /* My spores */
      var spores = {
        owner : user.uname,
        all   : globalSpores[user.uname]
      }
      socket.emit('mergespores', spores)
      
      /* Other spores */
      adjacent = new Array
      for (var name in globalSpores) {
        if (name == user.uname)
          continue
        for (var id in globalSpores[name]) {
          var spore = globalSpores[name][id]
          var dist = getDistance({lat : position.lat, lng : position.lng}, {lat : spore.lat, lng : spore.lng})
          if (dist < spore.radius)
            adjacent.push(spore)
        }
        if (adjacent.length != 0) {
          var spores = {
            owner : name,
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
          //radius : DEFAUTL_RADIUS
        })
      }
      db.profiles.update({uname : user.uname}, {$set : {
        online : false,
        position : user.position,
        spores : spores
      }})
    })
  })
}
