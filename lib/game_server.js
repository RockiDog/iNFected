var db           = null
var globalSpores = new Object
var io           = null
var globalKilled = new Object
var mongojs      = require('mongojs')
var online       = new Array
var socketio     = require('socket.io')

var DEFAUTL_RADIUS = 30
var INCREMENT_RADIUS = 10
var MAX_INFECT_DIST = 100

function getTopK(k) {
  var sorted = new Array
  for (var name in globalKilled)
    sorted.push(name)
  sorted.sort(function(a, b) {
    return globalKilled[b] - globalKilled[a]
  })
  var topK = new Array
  if (k > sorted.length) {
    for (var i = 0; i < sorted.length; ++i)
      topK.push({name : sorted[i], killed : globalKilled[sorted[i]]})
  } else {
    for (var i = 0; i < k; ++i)
      topK.push({name : sorted[i], killed : globalKilled[sorted[i]]})
  }
  return topK
}

function rad(d) {
  return d * Math.PI / 180.0
}

function getDistance(pointA, pointB) {
  var radLatA = rad(pointA.lat)
  var radLatB = rad(pointB.lat)
  var a = radLatA - radLatB
  var b = rad(pointA.lng) - rad(pointB.lng)
  var s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a/2), 2)
        + Math.cos(radLatA)*Math.cos(radLatB)*Math.pow(Math.sin(b/2), 2)))
  s = s * 6378.137
  s = Math.round(s * 10000) / 10
  return s
}


exports.listen = function(server) {
  db = mongojs('mongodb://soap:5102paoS@localhost:27017/infecteddb', ['profiles'])
  db.profiles.find(function(err, docs) {
    for (var i in docs) {
      var doc = docs[i]
      globalSpores[doc.uname] = doc.spores
    }
    console.log(globalSpores)
  })

  io = socketio.listen(server)
  io.set('log level', 1)

  io.on('connection', function(socket) {
    var user = new Object
    var maxSporeID = 0
    var inflateSpores = function() {
      for (var id in globalSpores[user.uname]) {
        var mySpore = globalSpores[user.uname][id]
        var isolated = true
        for (var otherName in globalSpores) {
          for (var otherId in globalSpores[otherName]) {
            if (user.uname != otherName || id != otherId) {
              var otherSpore = globalSpores[otherName][otherId]
              var dist = getDistance({lat : mySpore.lat, lng : mySpore.lng},
                {lat : otherSpore.lat, lng : otherSpore.lng})
              if (dist < mySpore.radius + otherSpore.radius + INCREMENT_RADIUS) {
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
    }
    
    socket.on('signup', function(info) {
      user.uname    = info.uname
      user.position = info.pos
      user.killed   = 0
      user.dead     = false
      user.spores   = new Array
      db.profiles.save(user, function(err, saved) {
        globalSpores[user.uname] = user.spores
        globalKilled[user.uname] = 0
        maxSporeID = 0
      })
      online.push(user.uname)
      setInterval(inflateSpores, 10000)
    })
    
    socket.on('signin', function(info) {
      user.uname    = info.uname
      user.position = info.pos
      console.log(info)
      db.profiles.findOne({uname : name}, function(err, doc) {
        user.killed = doc.killed
        user.dead   = doc.dead
        user.spores = globalSpores[user.uname]
        globalKilled[user.uname] = user.killed
        maxSporeID = user.spores.length
        
        db.profiles.update({uname : user.uname}, {$set : {online : true}})
        online.push(name)
        setInterval(inflateSpores, 10000)
      })
    })
    
    socket.on('addspore', function(position) {
      var dist = getDistance({lat : position.lat, lng : position.lng},
                              {lat : user.position.lat, lng : user.position.lng})
      if (dist > MAX_INFECT_DIST)
        return
      for (var name in globalSpores) {
        for (var id in globalSpores[name]) {
          var spore = globalSpores[name][id]
          var dist = getDistance({lat : position.lat, lng : position.lng},
                                  {lat : spore.lat, lng : spore.lng})
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
      if (spores.owner != user.uname) {
        if (globalKilled[user.uname] == undefined)
          globalKilled[user.uname] = 0
        ++globalKilled[user.uname]
      }
      io.sockets.emit('removespores', spores)
    })
    
    socket.on('position', function(position) {
      user.position = position
      
      /* My spores */
      var all = new Array
      for (var id in globalSpores[user.uname])
        if (globalSpores[user.uname][id] != null)
          all.push(globalSpores[user.uname][id])
      var spores = {
        owner : user.uname,
        all   : all
      }
      socket.emit('mergespores', spores)
      
      /* Other's spores */
      for (var name in globalSpores) {
        var adjacent = new Array
        if (name == user.uname)
          continue
        for (var id in globalSpores[name]) {
          var spore = globalSpores[name][id]
          if (spore == undefined)
            continue
          var dist = getDistance({lat : position.lat, lng : position.lng},
                                  {lat : spore.lat, lng : spore.lng})
          if (dist < MAX_INFECT_DIST)
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
        })
      }
      db.profiles.update({uname : user.uname}, {$set : {
        online : false,
        killed : globalKilled[user.uname],
        position : user.position,
        spores : spores
      }})
    })
  })
}
