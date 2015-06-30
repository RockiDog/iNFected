var sporeOptions = {
  root        : {
    centroid : {
      strokeColor   : 'orange',
      fillColor     : 'orange',
      strokeWeight  : 2,
      strokeOpacity : 1,
      fillOpacity	  : 1,
      strokeStyle	  : 'solid'
    },
    outer    : {
      strokeColor   : 'orange',
      fillColor     : 'orange',
      strokeWeight  : 2,
      strokeOpacity : 0.2,
      fillOpacity	  : 0.2,
      strokeStyle	  : 'solid'
    }
  },
  mySpores    : {
    centroid : {
      strokeColor   : 'green',
      fillColor     : 'green',
      strokeWeight  : 2,
      strokeOpacity : 1,
      fillOpacity	  : 1,
      strokeStyle	  : 'solid'
    },
    outer    : {
      strokeColor   : 'green',
      fillColor     : 'green',
      strokeWeight  : 2,
      strokeOpacity : 0.2,
      fillOpacity	  : 0.2,
      strokeStyle	  : 'solid'
    }
  },
  otherSpores : {
    centroid : {
      strokeColor   : 'pink',
      fillColor     : 'pink',
      strokeWeight  : 2,
      strokeOpacity : 1,
      fillOpacity	  : 1,
      strokeStyle	  : 'solid'
    },
    outer    : {
      strokeColor   : 'pink',
      fillColor     : 'pink',
      strokeWeight  : 2,
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
var mySporeMarkers    = new Array
var otherSporeMarkers = new Object

var map = new BMap.Map('i-map')
map.disableDragging()
map.centerAndZoom(new BMap.Point(120.128258, 30.265389), 18)
//map.setMapStyle({style : 'midnight'})
map.setDefaultCursor('crosshair')

/* Some callbacks */
function onSporePressed(event, owner, id) {
  if (online) {
    console.log(owner + ' ' + id)
    var count   = 0
    var pressed = true
    this.addEventListener('mouseup', function(event) {
      pressed = false
    })
    
    var pixel    = event.pixel
    var width    = 50
    
    $('body').append("<div id='progress-bar'></div>")
    $('#progress-bar').css('width', width + 'px')
      .css('left', pixel.x - width / 2 + 'px')
      .css('top', pixel.y - width + 'px')
      .css('right', 0)
      .css('bottom', 0)
    
    setInterval(function() {
      if (pressed) {
        if (count++ == 50) {
          var startColor = '#FC5B3F'
          var endColor   = '#6FD57F'
          var circle     = new ProgressBar.Circle('#progress-bar', {
            color       : startColor,
            trailColor  : '#eee',
            trailWidth  : 1,
            duration    : 1000,
            strokeWidth : 20,
            step        : function(state, circle) {
              if (pressed == false) {
                $('#progress-bar').fadeOut('1000')
                setTimeout(function() {
                  $('#progress-bar').remove()
                }, 200)
              } else {
                circle.path.setAttribute('stroke', state.color)
                circle.path.setAttribute('stroke-width', state.width)
              }
            }
          })
          
          circle.animate(1.0, {
            from : {color : startColor, width : 1},
            to   : {color : endColor, width : 20}
          }, function() {
            $('#progress-bar').fadeOut('1000')
            setTimeout(function() {
              $('#progress-bar').remove()
            }, 200)
            socket.emit('removespore', {owner : owner, all : [{id : id}]})
          })
        }
      } else {
        count = 0
      }
    }, 20)
  } else {
    console.log('you are offine')
  }
}

var first = true
function onPositionChanged(position) {
  var lng      = position.coords.longitude
  var lat      = position.coords.latitude
  myPosition   = new BMap.Point(lng, lat)

  if (first) {
    map.panTo(myPosition)
    first = false
  }

  if (myOuterMarker == null || myCentroidMarker == null) {
    var outer    = new BMap.Circle(myPosition, 100, sporeOptions.root.outer)
    var centroid = new BMap.Circle(myPosition, 3, sporeOptions.root.centroid)
    map.addOverlay(outer)
    map.addOverlay(centroid)
    myOuterMarker    = outer
    myCentroidMarker = centroid
  } else {
    myOuterMarker.setCenter(myPosition)
    myCentroidMarker.setCenter(myPosition)
  }

  if (online)
    socket.emit('position', myPosition)
}

function onAddSpores(spores) {
  for (var i in spores.all) {
    var spore = spores.all[i]
    var id  = spore.id
    var lat = spore.lat
    var lng = spore.lng
    var radius = spore.radius
    var pos = new BMap.Point(lng, lat)
    if (spores.owner == myName) {
      var outer    = new BMap.Circle(pos, radius, sporeOptions.mySpores.outer)
      var centroid = new BMap.Circle(pos, 3, sporeOptions.mySpores.centroid)
      centroid.id = id
      centroid.addEventListener('mousedown', function(event) {
        onSporePressed(event, spores.owner, this.id)
      })
      map.addOverlay(outer)
      map.addOverlay(centroid)
      mySporeMarkers[id] = {'centroid' : centroid, 'outer' : outer}
    } else {
      var outer    = new BMap.Circle(pos, radius, sporeOptions.otherSpores.outer)
      var centroid = new BMap.Circle(pos, 3, sporeOptions.otherSpores.centroid)
      centroid.id = id
      centroid.addEventListener('mousedown', function(event) {
        onSporePressed(event, spores.owner, this.id)
      })
      map.addOverlay(centroid)
      map.addOverlay(outer)
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
    map.removeOverlay(marker.centroid)
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
    marker.centroid.setCenter(new BMap.Point(lng, lat))
    marker.outer.setCenter(new BMap.Point(lng, lat))
    marker.outer.setRadius(radius)
  }
}

function onMergeSpores(spores) {
  if (spores.owner == myName) {
    for (var i in spores.all) {
      var spore  = spores.all[i]
      var id     = spore.id
      var lat    = spore.lat
      var lng    = spore.lng
      var radius = spore.radius
      var pos    = new BMap.Point(lng, lat)
      
      /* Create new marker if not exists */
      if (mySporeMarkers[id] == undefined) {
        var outer    = new BMap.Circle(pos, radius, sporeOptions.mySpores.outer)
        var centroid = new BMap.Circle(pos, 3, sporeOptions.mySpores.centroid)
        centroid.id = id
        centroid.addEventListener('mousedown', function(event) {
          console.log(this.id)
          onSporePressed(event, spores.owner, this.id)
        })
        map.addOverlay(outer)
        map.addOverlay(centroid)
        mySporeMarkers[id] = {'centroid' : centroid, 'outer' : outer}
      }
      
      /* Update if exists */
      else {
        var marker = mySporeMarkers[id]
        marker.centroid.setCenter(pos)
        marker.outer.setCenter(pos)
        marker.outer.setRadius(radius)
      }
    }
    
    /* Remove redundant markers */
    for (var id in mySporeMarkers) {
      if (spores.all[id] == undefined) {
        var marker = mySporeMarkers[id]
        map.removeOverlay(marker.cetroid)
        map.removeOverlay(marker.outer)
        delete mySporeMarkers[id]
      }
    }
  } else {
    for (var i in spores.all) {
      var spore  = spores.all[i]
      var id     = spore.id
      var lat    = spore.lat
      var lng    = spore.lng
      var radius = spore.radius
      var pos    = new BMap.Point(lng, lat)
      
      /* Create new marker if not exists */
      if (otherSporesMarkers[spores.owner] == undefined
          || otherSporeMarkers[spores.owner][id] == undefined) {
        var outer    = new BMap.Circle(pos, radius, sporeOptions.otherSpores.outer)
        var centroid = new BMap.Circle(pos, 3, sporeOptions.otherSpores.centroid)
        centroid.id = id
        centroid.addEventListener('mousedown', function(event) {
          onSporePressed(event, spores.owner, this.id)
        })
        map.addOverlay(outer)
        map.addOverlay(centroid)
        if (otherSporeMarkers[spores.owner] == undefined)
          otherSporeMarkers[spores.owner] = new Array
        otherSporeMarkers[spores.owner][id] = {'centroid' : centroid, 'outer' : outer}
      }
      
      /* Update if exists */
      else {
        var marker = otherSporeMarkers[spores.owner][id]
        marker.centroid.setCenter(pos)
        marker.outer.setCenter(pos)
        marker.outer.setRadius(radius)
      }
    }
    
    /* Remove redundant markers */
    for (var id in otherSporeMarkers[spores.owner]) {
      if (spores.all[id] == undefined)
        var marker = otherSporeMarkers[spores.owner][id]
        map.removeOverlay(marker.cetroid)
        map.removeOverlay(marker.outer)
        delete otherSporeMarkers[spores.owner][id]
    }
  }
}

var longPressed = false
function onMapLongPressed(event) {
  if (longPressed == true)
    return
  longPressed = true

  var position = event.point
  var pixel    = event.pixel
  var width    = 50

  $('body').append("<div id='progress-bar'></div>")
  $('#progress-bar').css('width', width + 'px')
    .css('left', pixel.x - width / 2 + 'px')
    .css('top', pixel.y - width + 'px')
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
              myPosition = new BMap.Point(position.coords.longitude, position.coords.latitude)
              socket.emit('signup', {uname : myName, pos : myPosition})
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
