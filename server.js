var db      = null
var fs      = require('fs')
var http    = require('http')
var mime    = require('mime')
var mongojs = require('mongojs')
var path    = require('path')
var query   = require('querystring')
var url     = require('url')

var server = http.createServer(function(request, response) {
  if (request.url == '/signin') {
    if (request.method == 'POST') {
      var post = ''
      request.on('data', function(chunk) {
        post += chunk
      })
      request.on('end', function() {
        post = query.parse(post)
        console.log(post)

        /***************************/
        /* Handle the signin event */
        /***************************/
        var uname  = post.uname
        var passwd = post.passwd

        db = mongojs('mongodb://soap:5102paoS@localhost:27017/infecteddb', ['users'])
        db.users.findOne({uname : uname}, function(err, doc) {

          /*******************/
          /* If error occurs */
          /*******************/
          if (err) {
            response.writeHead(500, {'Content-Type' : 'application/json; charset=utf-8'})
            response.write(JSON.stringify({ack : 0, msg : '服务器错误！'}))
            response.end()
            console.log(err.toString())
          }

          /****************************************/
          /* User not exists, register a new user */
          /****************************************/
          else if (!doc) {
            db.users.save({uname : uname, passwd : passwd, regdate : new Date()}, function(err, saved) {
              if (err) {
                response.writeHead(200, {'Content-Type' : 'application/json; charset=utf-8'})
                response.write(JSON.stringify({ack : -1, msg : '注册失败！'}))
                response.end()
                console.log(err.toString())
              } else {
                response.writeHead(200, {'Content-Type' : 'application/json; charset=utf-8'})
                response.write(JSON.stringify({ack : 1, msg : '注册成功！'}))
                response.end()
                console.log('User ' + saved.uname + ' has been registered')
              }
            })
          }

          /************************************/
          /* User exists, verify the password */
          /************************************/
          else {
            if (doc.passwd == passwd) {
              response.writeHead(200, {'Content-Type' : 'application/json; charset=utf-8'})
              response.write(JSON.stringify({ack : 2, msg : '登录成功！'}))
              response.end()
              console.log('User ' + uname + ' has been to the line')
            } else {
              response.writeHead(200, {'Content-Type' : 'application/json; charset=utf-8'})
              response.write(JSON.stringify({ack : -2, msg : '密码错误！'}))
              response.end()
            }
          }
        })
      })
    }
  } else {
    var filepath
    if (request.url == '/')
      filepath = './public/index.html'
    else
      filepath = './public' + request.url

    fs.readFile(filepath, 'binary', function(err, file) {
      if (err) {
        response.writeHead(500, {'Content-Type' : 'text/plain; charset=utf-8'});
        response.end(err.toString());
      } else {
        response.writeHead(200, {'Content-Type' : mime.lookup(path.basename(filepath)) + '; charset=utf-8'})
        response.write(file, 'binary');
        response.end();
      }
    })
  }
})

server.listen(7001, function() {
  var game_server = require('./lib/game_server.js').listen(this)
  console.log('Server running at http://127.0.0.1:7001')
})
