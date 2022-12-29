const express = require('express')
const app = express()
const path = require('path')
require('dotenv').config()
const ejsMate = require('ejs-mate')
const mongoose = require('mongoose')
const Admin = require('./models/Admin')
const Patient = require('./models/Patient')
const Doctor = require('./models/Doctor')
const AppointmentSlot = require('./models/AppointmentSlot')
const multer = require('multer')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const session = require('express-session')
const { v1: uuidv1 } = require('uuid')
const bodyParser = require('body-parser')
const expressValidator = require('express-validator')
const crypto = require('crypto')
const axios = require('axios')

const http = require('http')
const server = http.createServer(app)
const socketio = require('socket.io')
const io = socketio(server, {
   cors: {
      origin: ['http://localhost:3000'],
   },
})
server.listen(8000)

// CONNECT DATABASE
const connectDB = require('./config/db')
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

// const JWT_SECRET = process.env.JWT_SECRET
app.use(
   session({
      secret: 'secret',
      resave: true,
      saveUninitialized: true,
   }),
)

// SET STORAGE FOR chat prescriptions
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

// SET STORAGE for doctor certificates
var storage1 = multer.diskStorage({
   destination: function (req, files, cb) {
      cb(null, path.join(__dirname, 'public/images/prescriptions'))
   },
   filename: function (req, chat_prescription, cb) {
      console.log('chat_prescription')
      console.log(chat_prescription)
      cb(null, uuidv1() + path.extname(chat_prescription.originalname))
   },
})

var upload = multer({ storage: storage1 })

//========================PASSPORT SETUP=============================
app.use(passport.initialize())
app.use(passport.session())
// To Use Normal Login System
passport.use(new LocalStrategy(Patient.authenticate()))

passport.serializeUser(Patient.serializeUser())
passport.deserializeUser(Patient.deserializeUser())
//===================================================================

//Express Messages Middle ware
app.use(require('connect-flash')())
app.use(async function (req, res, next) {
   //giving access of loggedIn user to every templates(in views dir)
   res.locals.currentUser = req.user
   res.locals.messages = require('express-messages')(req, res)
   next()
})

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

const isVerified = async function (req, res, next) {
   try {
      const user = await Patient.findOne({ username: req.body.username })
      console.log('user')
      console.log(user)
      if (!user) {
         req.flash('danger', 'No account with that email exists.')
         return res.redirect('back')
      }
      if (user.isVerified) {
         return next()
      }
      req.flash(
         'danger',
         'Your account has not been verified! Please check your email to verify your account.',
      )
      return res.redirect('back')
   } catch (error) {
      console.log(error)
      req.flash(
         'danger',
         'Something went wrong! Please contact us for assistance',
      )
      res.redirect('back')
   }
}

const isAdmin = async function (req, res, next) {
   try {
      const foundAdmin = await Admin.findOne({ username: req.body.username })
      if (!foundAdmin) {
         req.flash('danger', 'You are not an admin.')
         return res.redirect('back')
      }
      if (foundAdmin.password != req.body.password) {
         req.flash('danger', 'wrong password')
         return res.redirect('back')
      }
      next()
   } catch (error) {
      console.log(error)
      res.redirect('back')
   }
}

const fs = require('fs')
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

   socket.on('sendPhoto', (file, callback) => {
      const user = users[socket.id]
      // console.log('file') // <Buffer 25 50 44 ...>
      // console.log(file) // <Buffer 25 50 44 ...>

      let filename = uuidv1()
      let filelocation = `/public/images/chatPhotos/${filename}.jpg`
      console.log(filelocation)
      // save the content to the disk, for example
      fs.writeFile(__dirname + filelocation, file, (err) => {
         console.log(err)
         socket
            .to(user.room)
            .emit(
               'otherPhotoMessage',
               formatMessage(
                  user.username,
                  `/images/chatPhotos/${filename}.jpg`,
               ),
            )
      })
   })

   // Listen for presc upload
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

const dbSlots = []
async function fetchAppointmentSlots() {
   for (let i = 0; i < 23; i++) {
      let slot = await AppointmentSlot.findOne({ slotId: i + 1 })
      dbSlots.push(slot)
   }
}
fetchAppointmentSlots()

app.post('/doctorRegister', async (req, res) => {
   try {
      // console.log('req.files')
      // console.log(req.files)
      // console.log(req.body)

      // let uploadFile
      // let uploadPath
      // let newFileName

      // if (!req.files || Object.keys(req.files).length === 0) {
      //    console.log('No Files were uploaded.')
      // } else {
      //    uploadFile = req.files.certificate
      //    newFileName = Date.now() + uploadFile.name

      //    uploadPath =
      //       require('path').resolve('./') +
      //       '/public/doctorCertificates/' +
      //       newFileName

      //    uploadFile.mv(uploadPath, function (err) {
      //       if (err) return res.status(500).send(err)
      //    })
      // }

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

      // let errors = req.validationErrors()
      // if (errors) {
      //    console.log('Error')
      //    res.render('doctor/doctorRegister.ejs', {
      //       errors,
      //    })
      // } else {

      const monday = req.body.monday
      const tuesday = req.body.tuesday
      const wednesday = req.body.wednesday
      const thursday = req.body.thursday
      const friday = req.body.friday
      const saturday = req.body.saturday
      const sunday = req.body.sunday

      const mondayAvailableAppointmentSlots = []
      const tuesdayAvailableAppointmentSlots = []
      const wednesdayAvailableAppointmentSlots = []
      const thursdayAvailableAppointmentSlots = []
      const fridayAvailableAppointmentSlots = []
      const saturdayAvailableAppointmentSlots = []
      const sundayAvailableAppointmentSlots = []

      if (monday) {
         monday.forEach((slot) => {
            index = parseInt(slot) - 1
            mondayAvailableAppointmentSlots.push(dbSlots[index]._id)
         })
      }
      // if (tuesday) {
      // }
      // if (wednesday) {
      // }
      // if (thursday) {
      // }
      // if (friday) {
      // }
      // if (saturday) {
      // }
      // if (sunday) {
      // }

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
         // certificate: newFileName,
         // availableAppointmentSlots: req.body.availableAppointmentSlots,
      })

      const registeredDoctor = await doctor.save()
      console.log(registeredDoctor)
      // }
   } catch (error) {
      console.log(error)
   }
   res.redirect('/doctorRegister')
})

app.get('/patientRegister', (req, res) => {
   console.log('dbSlots')
   console.log(dbSlots)
   res.render('patient/patientRegister.ejs')
})

app.get('/login', (req, res) => {
   res.render('login.ejs')
})

app.get('/admin_login', (req, res) => {
   res.render('adminLogin.ejs')
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
   axios
      .get('http://localhost:3000/searchdoc')
      .then(function (response) {
         console.log(response.data)
         res.render('doctor_search.ejs', { doctors: response.data })
      })
      .catch((err) => {
         res.send(err)
      })
})
app.get('/searchdoc', (req, res) => {
   Doctor.find()
      .then((doctor) => {
         res.send(doctor)
      })
      .catch((err) => {
         res.status(500).send({
            message:
               err.message ||
               'Error Occurred while retriving doctor information',
         })
      })
   // res.render('doctor_search.ejs', { doctor: 'New Doctor' })
})

app.get('/register/success', (req, res) => {
   res.render('register_success.ejs')
})

app.get('/register/pending', (req, res) => {
   res.render('register_pending.ejs')
})

app.post('/patientRegister', async (req, res) => {
   try {
      const { username, fname, lname, phone, gender, location, pswd } = req.body

      req.checkBody('fname', 'Name is required').notEmpty()
      req.checkBody('lname', 'Name is required').notEmpty()
      req.checkBody('phone', 'Phone is required').notEmpty()
      req.checkBody('username', 'Enter a valid Email-id').isEmail()
      req.checkBody('phone', 'Enter a valid Phone Number').isLength({
         min: 10,
         max: 10,
      })
      // req
      //   .checkBody("password", "password must be of minimum 6 characters")
      //   .isLength({ min: 6 });
      req.checkBody('cpswd', 'Passwords do not match').equals(pswd)

      let errors = req.validationErrors()
      if (errors) {
         req.flash('danger', errors[0].msg)
         console.log('errors')
         console.log(errors)
         res.redirect('back')
      } else {
         const patient = new Patient({
            username: username,
            usernameToken: crypto.randomBytes(64).toString('hex'),
            isVerified: false,
            first_name: fname,
            last_name: lname,
            phone: phone,
            gender: gender,
            location: location,
         })
         const registedUser = await Patient.register(patient, pswd)
         console.log(registedUser)

         // const secret = JWT_SECRET
         // const payload = {
         //    username: patient.username,
         // }
         // const token = jwt.sign(payload, secret, { expiresIn: '15m' })
         const link = `http://localhost:3000/verify-email/${patient.usernameToken}`
         req.flash(
            'success',
            'You are now registered! Please verify your account through mail.',
         )
         console.log(link)
         // sendverifyMail(username, link).then((result) =>
         //    console.log('Email sent....', result),
         // )
         res.redirect('back')
      }
   } catch (error) {
      console.log(error)
      req.flash('danger', 'Email is already registered!')
      res.redirect('back')
   }
})

//Email verification route
app.get('/verify-email/:token', async (req, res, next) => {
   try {
      const patient = await Patient.findOne({ usernameToken: req.params.token })
      if (!patient) {
         req.flash(
            'danger',
            'Token is invalid! Please contact us for assistance.',
         )
         return res.redirect('/login')
      }
      patient.usernameToken = null
      patient.isVerified = true
      await patient.save()
      req.flash('success', 'Email verified successfully!')
      res.redirect('/login')
   } catch (error) {
      console.log(error)
      req.flash('danger', 'Token is invalid! Please contact us for assistance.')
      res.redirect('/login')
   }
})

app.post('/login', isVerified, (req, res, next) => {
   passport.authenticate('local', {
      failureRedirect: '/login',
      successRedirect: '/',
      failureFlash: true,
      successFlash: 'Welcome to HealthPlus ' + req.body.username + '!',
   })(req, res, next)
})

app.post('/admin_login', isAdmin, (req, res, next) => {
   // passport.authenticate('local', {
   //    failureRedirect: '/login',
   //    successRedirect: '/admin/doctorVerification',
   //    failureFlash: true,
   //    successFlash: 'Welcome Admin' + req.body.username + '!',
   // })(req, res, next)
   console.log('admin-loggedin')
   res.redirect('/admin/doctorVerification')
})

//Logout
app.get('/logout', (req, res) => {
   req.logout()
   req.flash('success', 'Logged Out Successfully.')
   res.redirect('/login')
})

app.get('/:filename', (req, res) => {
   res.download(
      __dirname + '/public/images/prescriptions/' + req.params.filename,
   )
})

const PORT = 3000
app.listen(PORT, () => console.log(`SERVER STARTED AT ${PORT}!`))
