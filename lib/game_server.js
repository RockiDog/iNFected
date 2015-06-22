var socketio = require('socket.io')
var mongojs  = require('mongojs')
var io       = null

// TODO The collection 'profiles' to be updated
exports.listen = function(server) {
  io = socketio.listen(server)
  io.set('log level', 1)
  io.sockets.on('connection', function(socket) {
    var uname  = null
    var passwd = null
    
    /**************************/
    /* Handle the signin event */
    /**************************/
    socket.on('signin', function(auth) {
      uname  = auth.uname
      passwd = auth.passwd
      
      db = mongojs('soap:5102paoS@localhost:27017/infecteddb', ['users', 'profiles'])
      db.users.find({uname : uname}, function(err, doc) {
        
        /*******************/
        /* If error occurs */
        /*******************/
        if (err) {
          socket.emit('signin', {ack : 0, msg : '服务器错误！'})
          console.log(err)
        }
        
        /****************************************/
        /* User not exists, register a new user */
        /****************************************/
        else if (!doc) {
          db.users.save({uname : uname, passwd : passwd, regdate : new Date()}, function(err, saved) {
            if (err) {
              socket.emit('signin', {ack : -1, msg : '注册失败！'})
              console.log(err)
            } else {
              socket.emit('signin', {ack : 1, msg : '注册成功！'})
              online.push(uname)
              console.log('User ' + saved.uname + ' has been registered')
            }
          })
        }
        
        /************************************/
        /* User exists, verify the password */
        /************************************/
        else {
          if (doc.passwd == passwd) {
            socket.emit('signin', {ack : 2, msg : '登录成功！'})
            online.push(uname)
            console.log('User ' + uname + ' has been to the line')
          } else {
            socket.emit('signin', {ack : -2, msg : '密码错误！'})
          }
        }
      })
    })
    
    /***************************/
    /* Handle the logout event */
    /***************************/
    socket.on('disconnect', function() {
      online.pop(uname)
      console.log('User ' + uname + ' is offline')
    })
  })
}
