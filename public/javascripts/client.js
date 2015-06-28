var sporeOptions = {
  mySpores    : {
    centroid : {
      strokeColor   : 'green',
      fillColor     : 'green',
      strokeWeight  : 1,
      strokeOpacity : 1,
      fillOpacity	  : 1,
      strokeStyle	  : 'solid'
    },
    outer    : {
      strokeColor   : 'green',
      fillColor     : 'green',
      strokeWeight  : 1,
      strokeOpacity : 0.2,
      fillOpacity	  : 0.2,
      strokeStyle	  : 'solid'
    }
  },
  otherSpores : {
    centroid : {
      strokeColor   : 'pink',
      fillColor     : 'pink',
      strokeWeight  : 1,
      strokeOpacity : 1,
      fillOpacity	  : 1,
      strokeStyle	  : 'solid'
    },
    outer    : {
      strokeColor   : 'pink',
      fillColor     : 'pink',
      strokeWeight  : 1,
      strokeOpacity : 0.2,
      fillOpacity	  : 0.2,
      strokeStyle	  : 'solid'
    }
  }
}

var online = false
var client = null
var socket = null
var myName            = new String
var myPosition        = null
var myCentroidMarker  = null
var myOuterMarker     = null
var mySporeMarkers    = new Object
var otherSporeMarkers = new Object

var map = new BMap.Map('i-map')
map.disableDragging()
map.centerAndZoom(new BMap.Point(120.128258, 30.265389), 18)
map.setMapStyle({style : 'midnight'})
map.setDefaultCursor('crosshair')

/* Some callbacks */
var first = true
function onPositionChanged(position) {
  var lng      = position.coords.longitude
  var lat      = position.coords.latitude
  var pos      = new BMap.Point(lng, lat)
  var centroid = new BMap.Circle(pos, 3, sporeOptions.mySpores.centroid)
  var outer    = new BMap.Circle(pos, 50, sporeOptions.mySpores.outer)
  if (first) {
    map.panTo(pos)
    first = false
  }

  if (myCentroidMarker != null) {
    map.removeOverlay(myCentroidMarker)
  }
  if (myOuterMarker != null) {
    map.removeOverlay(myOuterMarker)
  }
  map.addOverlay(outer)
  map.addOverlay(centroid)
  myCentroidMarker = centroid
  myOuterMarker    = outer

  if (online) {
    socket.emit('position', pos)
    myPosition = pos
  }
}

function onAddSpores(spores) {
  for (var i in spores.all) {
    var spore = spores.all[i]
    var id  = spore.id
    var lng = spore.lng
    var lat = spore.lat
    var radius = spore.radius
    var pos = new BMap.Point(lng, lat)
    if (spores.owner == myName) {
      var centroid = new BMap.Circle(pos, 3, sporeOptions.mySpores.centroid)
      var outer    = new BMap.Circle(pos, radius, sporeOptions.mySpores.outer)
      map.addOverlay(outer)
      map.addOverlay(centroid)
      mySporeMarkers[id] = {'centroid' : centroid, 'outer' : outer}
    } else {
      var centroid = new BMap.Circle(pos, 3, sporeOptions.otherSpores.centroid)
      var outer    = new BMap.Circle(pos, radius, sporeOptions.otherSpores.outer)
      map.addOverlay(outer)
      map.addOverlay(centroid)
      if (otherSporeMarkers[spores.owner] == undefined)
        otherSporeMarkers[spores.owner] = new Array
      otherSporeMarkers[spores.owner][id] = {'centroid' : centroid, 'outer' : outer}
    }
  }
}

function onRemoveSpores(spores) {
  for (var i in spores.all) {
    var spore  = spores.all[i]
    var id     = spore.id
    var marker = null
    if (spores.owner == myName)
      marker = mySporeMarkers[id]
    else
      marker = otherSporeMarkers[spores.owner][id]
    map.removeOverlay(marker.cetroid)
    map.removeOverlay(marker.outer)
  }
}

function onUpdateSpores(spores) {
  for (var i in spores.all) {
    var spore = spores.all[i]
    var marker = null
    if (spores.owner == myName)
      marker = mySporeMarkers[id]
    else
      marker = otherSporeMarkers[spores.owner][id]
    var id     = spore.id
    var lng    = spore.lng
    var lat    = spore.lat
    var radius = spore.radius
    marker.centroid.setCenter(lng, lat)
    marker.outer.setCenter(lng, lat)
    marker.outer.setRadius(radius)
  }
}

function onMergeSpores(spores) {
  if (spores.owner == myName) {
    for (var i in spores.all) {
      var spore = spores.all[i]
      var id = spore.id
      
      /* Create new marker if not exists */
      if (mySporeMarkers[id] == undefined) {
        var centroid = new BMap.Circle(pos, 3, sporeOptions.mySpores.centroid)
        var outer    = new BMap.Circle(pos, radius, sporeOptions.mySpores.outer)
        map.addOverlay(outer)
        map.addOverlay(centroid)
        mySporeMarkers[id] = {'centroid' : centroid, 'outer' : outer}
      }
      
      /* Update if exists */
      else {
        var marker = mySporeMarkers[id]
        var lng    = spore.lng
        var lat    = spore.lat
        var radius = spore.radius
        marker.centroid.setCenter(lng, lat)
        marker.outer.setCenter(lng, lat)
        marker.outer.setRadius(radius)
      }
    }
    
    /* Remove redundant markers */
    for (var id in mySporeMarkers) {
      if (spores.all[id] == undefined)
        delete mySporeMarkers[id]
    }
  } else {
    for (var i in spores.all) {
      var spore = spores.all[i]
      var id = spore.id
      
      /* Create new marker if not exists */
      if (otherSporeMarkers[spores.owner][id] == undefined) {
        var centroid = new BMap.Circle(pos, 3, sporeOptions.otherSpores.centroid)
        var outer    = new BMap.Circle(pos, radius, sporeOptions.otherSpores.outer)
        map.addOverlay(outer)
        map.addOverlay(centroid)
        if (otherSporeMarkers[spores.owner] == undefined)
          otherSporeMarkers[spores.owner] = new Array
        otherSporeMarkers[spores.owner][id] = {'centroid' : centroid, 'outer' : outer}
      }
      
      /* Update if exists */
      else {
        marker = otherSporeMarkers[spores.owner][id]
        var id     = spore.id
        var lng    = spore.lng
        var lat    = spore.lat
        var radius = spore.radius
        marker.centroid.setCenter(lng, lat)
        marker.outer.setCenter(lng, lat)
        marker.outer.setRadius(radius)
      }
    }
    
    /* Remove redundant markers */
    for (var id in otherSporeMarkers[spores.owner]) {
      if (spores.all[id] == undefined)
        delete otherSporeMarkers[spores.owner][id]
    }
  }
}

function onSporeClicked() {
}

var longPressed = false
function onMapLongPressed(event) {
  if (longPressed == true)
    return
  longPressed = true

  var position = event.point
  var point = map.pointToPixel(position)
  var width = 50

  $('body').append("<div id='progress-bar'></div>")
  $('#progress-bar').css('width', width + 'px')
    .css('left', point.x - width / 2 + 'px')
    .css('top', point.y - width + 'px')
    .css('right', 0)
    .css('bottom', 0)

  if (online) {
    var startColor = '#FC5B3F'
    var endColor   = '#6FD57F'
    var circle     = new ProgressBar.Circle('#progress-bar', {
      color       : startColor,
      trailColor  : '#eee',
      trailWidth  : 1,
      duration    : 1000,
      strokeWidth : 20,
      step        : function(state, circle) {
        circle.path.setAttribute('stroke', state.color)
        circle.path.setAttribute('stroke-width', state.width)
      }
    })
    
    circle.animate(1.0, {
        from : {color : startColor, width : 1},
        to   : {color : endColor, width : 20}
      }, function() {
        $('#progress-bar').fadeOut('1000')
        setTimeout(function() {
          $('#progress-bar').remove()
          longPressed = false
        }, 200)
        socket.emit('addspore', position)
      })
  } else {
    console.log('you are offine')
    longPressed = false
  }
}

/* Synchronize the loaction with the server */
if (navigator.geolocation)
  navigator.geolocation.watchPosition(onPositionChanged)
else
  console.log('Failed to get location')

/* Sign in&up logic */
$(document).ready(function() {
  $('.form-signin').submit(function(event) {
    event.preventDefault()
    var uname  = $('#input-uname').val()
    var passwd = $('#input-passwd').val()
    var hashedPasswd = md5(passwd)
    console.log(uname + ' ' + passwd)
    $.post('/signin', {uname : uname, passwd : hashedPasswd}, function(response) {
      switch (response.ack) {
        case 0:
        case -1:
        case -2: break;
        case 1: {
          $('#signin-container').remove()
          map.enableDragging();
          map.addEventListener('rightclick', onMapLongPressed)
          map.addEventListener('longpress', onMapLongPressed)
          
          myName = uname
          online = true
          socket = io.connect()
            .on('addspores', onAddSpores)
            .on('removespores', onRemoveSpores)
            .on('updatespores', onUpdateSpores)
            .on('mergespores', onMergeSpores)
          
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
              socket.emit('signup', {uname : myName, pos : position})
            })
          } else {
            console.log('Failed to get location')
          }
        } break;
        case 2: {
          $('#signin-container').remove()
          map.enableDragging();
          map.addEventListener("rightclick", onMapLongPressed)
          map.addEventListener('longpress', onMapLongPressed)
          
          myName = uname
          online = true
          socket = io.connect()
            .on('addspores', onAddSpores)
            .on('removespores', onRemoveSpores)
            .on('updatespores', onUpdateSpores)
            .on('mergespores', onMergeSpores)
            .emit('signin', uname)
        } break;
      }
      console.log(response)
    })
  })
})
