const express = require('express')
const app = express()
const path = require('path')
require('dotenv').config()
const ejsMate = require('ejs-mate')
const mongoose = require('mongoose')
const Admin = require('./models/Admin')
const Patient = require('./models/Patient')
const Doctor = require('./models/Doctor')

const http = require('http')
const server = http.createServer(app)
const socketio = require('socket.io')
const io = socketio(server, {
   cors: {
      origin: ['http://localhost:3000'],
   },
})
server.listen(8000)

//====================DATABASE CONNECTION==========================

// const dbUrl = "mongodb://localhost:27017/edu";
const dbUrl = process.env.MY_MONGODB_URI

const connectDB = async () => {
   try {
      await mongoose.connect(dbUrl, {
         useUnifiedTopology: true,
         useNewUrlParser: true,
         //useFindAndModify: false,
         //useCreateIndex: true,
      })
      console.log('DATABASE CONNECTED')
   } catch (err) {
      console.error(err.message)
      process.exit(1)
   }
}
// CONNECT DATABASE
// connectDB()

app.use(express.json())
app.engine('ejs', ejsMate)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.static(path.join(__dirname, 'public'))) //for serving static files
// app.use(
//    express.urlencoded({
//       extended: true,
//    }),
// ) //for parsing form data
// app.use(methodOverride('_method'))
// app.use(flash())

// app.use(
//    session({
//       secret: '#sms#',
//       resave: true,
//       saveUninitialized: true,
//    }),
// )

// ==========================SOCKET.IO====================================
const { formatMessage, getRoomUsers } = require('./utils/messages')

const users = {}

io.on('connection', (socket) => {
   socket.on('joinRoom', ({ username, room }) => {
      users[socket.id] = { username: username, room: room }

      socket.join(room)

      // Welcome current user
      socket.emit('update', 'Welcome to HealthPlus!')

      // Broadcast when a user connects
      socket.broadcast
         .to(room)
         .emit('update', `${username} has joined the chat`)

      // Send room-users info
      io.to(room).emit('roomUsers', {
         users: getRoomUsers(users, room),
      })
   })

   // Listen for chatMessage
   socket.on('chatMessage', (msg) => {
      const user = users[socket.id]

      socket
         .to(user.room)
         .emit('othermessage', formatMessage(user.username, msg))
   })

   // Runs when client disconnects
   socket.on('disconnect', () => {
      const user = users[socket.id]
      if (user) {
         io.to(user.room).emit('update', `${user.username} has left the chat`)
         delete users[socket.id]
         // Send room-users info
         io.to(user.room).emit('roomUsers', {
            users: getRoomUsers(users, user.room),
         })
      }
   })
})
// ================================================================================

// ==================ROUTES=======================
app.get('/', (req, res) => {
   res.render('home.ejs')
})

app.get('/demo', (req, res) => {
   res.render('demo.ejs')
})

app.get('/registerChoice', (req, res) => {
   res.render('registerChoice.ejs')
})

app.get('/doctorRegister', (req, res) => {
   res.render('doctor/doctorRegister.ejs')
})

app.get('/patientRegister', (req, res) => {
   res.render('patient/patientRegister.ejs')
})

app.get('/login', (req, res) => {
   res.render('login.ejs')
})

app.get('/chat_appointment/:appointmentid&:username', async (req, res) => {
   const appointmentid = req.params.appointmentid
   const username = req.params.username

   // if (!mongoose.isValidObjectId(appointmentid))
   //    return res.send('No Appointment found')
   // const foundAppointment = await Appointment.findById(appointmentid)

   // if (!foundAppointment) {
   //    return res.send('No Appointment found')
   // }

   res.render('chat.ejs', { username: username, room: appointmentid })
})

app.get('/contact', (req, res) => {
   res.render('contact.ejs')
})

app.get('/appointment', (req, res) => {
   res.render('appointment.ejs')
})

app.get('/doctors', (req, res) => {
   res.render('doctor/doctors.ejs')
})

const PORT = 3000
app.listen(PORT, () => console.log(`SERVER STARTED AT ${PORT}!`))
