const express = require('express')
const app = express()
const path = require('path')
require('dotenv').config()
const ejsMate = require('ejs-mate')
const mongoose = require('mongoose')
const Admin = require('./models/Admin')
const Patient = require('./models/Patient')
const Doctor = require('./models/Doctor')
const multer = require('multer')
const { v1: uuidv1 } = require('uuid')
const bodyParser = require('body-parser')
const expressValidator = require('express-validator')
const fileUpload = require('express-fileupload')
const crypto = require('crypto')

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
connectDB()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

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

app.use(fileUpload())

// app.use(
//    session({
//       secret: '#sms#',
//       resave: true,
//       saveUninitialized: true,
//    }),
// )

// SET STORAGE
var storage = multer.diskStorage({
   destination: function (req, chat_prescription, cb) {
      cb(null, path.join(__dirname, 'public/images/prescriptions'))
   },
   filename: function (req, chat_prescription, cb) {
      console.log('chat_prescription')
      console.log(chat_prescription)
      cb(null, uuidv1() + path.extname(chat_prescription.originalname))
   },
})

var upload = multer({ storage: storage })

// Express Validator Middleware
app.use(
   expressValidator({
      errorFormatter: function (param, msg, value) {
         var namespace = param.split('.'),
            root = namespace.shift(),
            formParam = root

         while (namespace.length) {
            formParam += '[' + namespace.shift() + ']'
         }
         return {
            param: formParam,
            msg: msg,
            value: value,
         }
      },
   }),
)

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

   // Listen for blahblah
   socket.on('presc_uploaded', (filename) => {
      const user = users[socket.id]

      socket.to(user.room).emit('patient_can_downloadnow', filename)
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

app.get('/admin/doctorVerification', (req, res) => {
   res.render('doctor/doctor_verification.ejs')
})

app.post('/doctorRegister', async (req, res) => {
   try {
      let uploadFile
      let uploadPath
      let newFileName

      if (!req.files || Object.keys(req.files).length === 0) {
         console.log('No Files were uploaded.')
      } else {
         uploadFile = req.files.certificate
         newFileName = Date.now() + uploadFile.name

         uploadPath =
            require('path').resolve('./') +
            '/public/doctorCertificates/' +
            newFileName

         uploadFile.mv(uploadPath, function (err) {
            if (err) return res.status(500).send(err)
         })
      }

      // req.checkBody("username","Username is required").notEmpty();
      // req.checkBody("first_name","First name is required").notEmpty();
      // req.checkBody("last_name","Last name is required").notEmpty();
      // req.checkBody("phone","Enter a valid Contact No.").isMobilePhone('en-IN');
      // req.checkBody("email","Enter a valid Email-id").isEmail();
      // req.checkBody("password","Password must be of minimum 6 characters").isLength({ min:6 })
      // req.checkBody("cpassword","Passwords do not match").equals(req.body.password);
      // req.checkBody("specialty","Select a specialty").notEmpty();
      // req.checkBody("yearsOfExperience","Years of Experience is required").notEmpty();
      // req.checkBody("consultationFee","Consultation Fee is required").notEmpty();
      // req.checkBody("clinicLocation","Clinic Location is required").notEmpty();
      // req.checkBody("description","Description is required").notEmpty();
      // req.checkBody("certificate","Certificate is required").notEmpty();
      // req.checkBody("slot","Select available session slots").notEmpty();

      let errors = req.validationErrors()
      if (errors) {
         console.log('Error')
         res.render('doctor/doctorRegister.ejs', {
            errors,
         })
      } else {
         const doctor = new Doctor({
            username: req.body.uname,
            usernameToken: crypto.randomBytes(64).toString('hex'),
            isVerified: false,
            first_name: req.body.fname,
            last_name: req.body.lname,
            phone: req.body.contact,
            email: req.body.email,
            specialty: req.body.speciality,
            yearsOfExperience: req.body.exp,
            consultationFee: req.body.fee,
            clinicLocation: req.body.location,
            description: req.body.desc,
            certificate: newFileName,
            availableAppointmentSlots: req.body.availableAppointmentSlots,
         })

         const registeredDoctor = await doctor.save()
         console.log(registeredDoctor)
      }
   } catch (error) {
      console.log(error)
   }
   res.redirect('/doctorRegister')
})

app.get('/patientRegister', (req, res) => {
   res.render('patient/patientRegister.ejs')
})

app.get('/login', (req, res) => {
   res.render('login.ejs')
})

app.get(
   '/chat_appointment/:appointmentid&:username&:usertype',
   async (req, res) => {
      const appointmentid = req.params.appointmentid
      const username = req.params.username
      const usertype = req.params.usertype

      // if (!mongoose.isValidObjectId(appointmentid))
      //    return res.send('No Appointment found')
      // const foundAppointment = await Appointment.findById(appointmentid)

      // if (!foundAppointment) {
      //    return res.send('No Appointment found')
      // }

      res.render('chat.ejs', {
         username: username,
         room: appointmentid,
         usertype: usertype,
      })
   },
)

app.post(
   '/:appointmentid/uploadChatPrescription',
   upload.single('chat_prescription'),
   (req, res) => {
      try {
         // const appointment = await Appointment.findById(req.params.appointmentid)
         // console.log(req.file)
         const file = req.file
         // if (!file) {
         //    req.flash('danger', 'Please select a file first.')
         //    return res.redirect('back')
         // }
         console.log('req.file')
         console.log(req.file)
         // appointment.prescription = req.file.filename
         // appointment.save()

         res.send({ status: 'success', filename: req.file.filename })
         // req.flash('success', 'Profile picture is updated')
         // return res.redirect('/users/' + user._id)
      } catch (error) {
         console.log(error)
      }
   },
)

app.get('/:filename', (req, res) => {
   // console.log('hello')
   // console.log(
   //    'F:/HealthPlus/public/images/prescriptions/' + req.params.filename,
   // )
   res.download(
      __dirname + '/public/images/prescriptions/' + req.params.filename,
   )
})

app.get('/contact', (req, res) => {
   res.render('contact.ejs')
})

app.get('/appointment', (req, res) => {
   res.render('appointment.ejs')
})

app.get('/admin/doctors', (req, res) => {
   res.render('doctors.ejs')
})

app.get('/search', (req, res) => {
   res.render('doctor_search.ejs')
})

app.get('/register/success', (req, res) => {
   res.render('register_success.ejs')
})

app.get('/register/pending', (req, res) => {
   res.render('register_pending.ejs')
})

const PORT = 3000
app.listen(PORT, () => console.log(`SERVER STARTED AT ${PORT}!`))
