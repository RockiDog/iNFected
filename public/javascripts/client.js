var Client = function(socket, callback) {
  this.socket = socket
}

Client.prototype.signin = function(uname, passwd) {
  this.socket.emit('signin', {uname : uname, passwd : passwd})
  console.log('emit signin')
}

Client.prototype.on = function(signal, callback) {
  this.socket.on(signal, callback)
  console.log('set on ' + signal + ' callback')
}
