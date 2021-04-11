const express = require("express"),
      session = require("express-session"),
      compression = require("compression"),
      bodyParser = require('body-parser'),
      dotenv = require("dotenv"),
      https = require('https'),
      fs = require('fs')

dotenv.config()
let app = express()
var server
var privkey
var cert
var fullchain

privkey = process.env.PRIVKEY
cert = process.env.CERT
fullchain = process.env.FULLCHAIN

if ((privkey) && (cert) && (fullchain)) {
    console.log("found certs... using https...")
    server = require("https").createServer({
	key: fs.readFileSync(
	    process.env.PRIVKEY || './tls/privkey.pem'
	),
	cert: fs.readFileSync(
	    process.env.CERT || './tls/cert.pem'
	),
	ca: fs.readFileSync(
	    process.env.FULLCHAIN || './tls/fullchain.pem'
	),
	requestCert: true,
	rejectUnauthorized: false
    }, app)
} else {
    console.log("no certs found... falling back to http only...")
    server = require("http").createServer(app)
}

const io = require('socket.io')({
  pingTimeout: 20000,
  pingInterval: 10000
}).listen(server)
const routes = require("./routes/main")

// prevent clients from using http polling
io.set('transports', ['websocket'])
// two week cache period for static files
let cacheTime = 14 * 24 * 60 * 60 * 1000
// compress app responses (before sending to client)
app.use(compression())
// use the "public" directory to serve static files (and set cache time)
app.use(express.static(__dirname + "/public", {maxAge: cacheTime}))
// set express view engine to render Pug
app.set("view engine", "pug")
// url encoding
app.use(express.urlencoded({extended: true}))
// use environment variable SESSION_SECRET (must be defined when running from command line)
let userSession = (session({
  secret: process.env.SESSION_SECRET || "thisisatemporarysessionsecret",
  resave: true,
  saveUninitialized: true,
  authenticated: false
}))
app.use(userSession)

function checkLoggedIn(request, response, next) {
  if (request.session.authenticated == undefined){
    response.redirect('/login')
  }
  else{
    next()
  }
}

// redirect to login if not logged in yet
app.get('*', (request, response, next) => {
  if(request.path !== "/login") {
    checkLoggedIn(request, response, next)
  }
  else {
    next()
  }
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
// create routes for all the pages
for (let pages in routes){
  app.use(pages, routes[pages])
}

io.use((socket, next) => {
  userSession(socket.request, socket.request.res || {}, next)
})

function removeNulls(array) {
  return array.filter((element) => {
    return element != null
  })
}

let users = [],
    roomsRoutes = require("./routes/room")

io.sockets.on('connection', socket => {
  let room = socket.request.session.roomID
  socket.on('newUser', data => {
    socket.join(room)
    users.push({username: socket.request.session.username, id: socket.id, color: socket.request.session.color, userRoom: room})
    users = removeNulls(users)
    io.sockets.in(room).emit('newUser', [users.filter(user => user.userRoom == room)])
  })
  socket.on('disconnect', () => {
    users[users.indexOf(users.find(user => user.id == socket.id))] = null
    users = removeNulls(users)
    io.sockets.in(room).emit("userLeft", [[users.find(user => user.userRoom == room)], socket.id])

    if(!(room in io.sockets.adapter.rooms)) {
      roomsRoutes.destroyRoom(room)
    }
  })
  socket.on('newMessage', (data) => {
    if(data.message.length > 0 && data.message.length <= 160) {
      io.sockets.in(room).emit('newMessage', {username: socket.request.session.username, message: data.message, color: socket.request.session.color, id: data.id})
    }
  })
})

app.get('/logout', function(request, response, next) {
  request.session.authenticated = false
  request.session.destroy(function(error) {
    if(error) {
      return next(error)
    } else {
      return response.redirect('/login')
    }
  })
})

server.listen(process.env.PORT || 4000, () => {
  console.log("server is live on port 4000")
})
