const express = require("express"),
      session = require("express-session"),
      compression = require("compression"),
      bodyParser = require('body-parser')

let app = express()
const server = require("http").createServer(app)
const io = require('socket.io').listen(server)
const routes = require("./routes/main")

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
  if(request.url.indexOf('/login') == -1) {
    checkLoggedIn(request, response, next)
  }
  else{
    next()
  }
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

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
// create routes for all the pages
for (let pages in routes){
  app.use(pages, routes[pages])
}

io.use((socket, next) => {
  userSession(socket.request, socket.request.res, next)
})

function removeNulls(array) {
  return array.filter((element) => {
    return element != null
  })
}

let users = []

io.sockets.on('connection', socket => {
  socket.on('newUser', data => {
    users.push({username: socket.request.session.username, id: socket.id})
    users = removeNulls(users)
    io.emit('newUser', [users, socket.id])
  })
  socket.on('disconnect', () => {
    users[users.indexOf(users.find(user => user.id == socket.id))] = null
    users = removeNulls(users)
    io.emit("userLeft", [users, socket.id])
  })
  socket.on('newMessage', (message) => {
    if(message.length > 0 && message.length <= 160) {
      socket.broadcast.emit('newMessage', {username: socket.request.session.username, message: message})
    }
  })
})

server.listen(4000, () => {
  console.log("server is live on port 4000")
})
