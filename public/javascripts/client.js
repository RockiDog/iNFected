var Client = function(socket) {
  this.socket = socket
  this.mySpores = []
  this.otherSpores = []
}

Client.prototype.syncPos(position) {
  socket.emit('position', position)
  this.position = position
}

Client.prototype.start() {
  var client = this

  /* Update the spores */
  this.socket.on('spores', function(spores) {
    client.mySpores    = spores['mySpores']
    client.otherSpores = spores['otherSpores']
  })
}
