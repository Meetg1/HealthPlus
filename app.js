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
const Appointment = require('./models/Appointment')
const multer = require('multer')
const { v1: uuidv1 } = require('uuid')
const bodyParser = require('body-parser')
const moment = require("moment");
const expressValidator = require('express-validator')
const crypto = require('crypto')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const session = require('express-session')
const methodOverride = require('method-override')
// const cookieParser = require('cookie-parser')
const flash = require('connect-flash')
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
app.use(
   express.urlencoded({
      extended: true,
   }),
) //for parsing form data
app.use(methodOverride('_method'))
// app.use(flash())

// app.use(cookieParser('HealthplusSecure'));
app.use(
   session({
      secret: 'HealthplusSecretSession',
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
passport.use('local.patient', new LocalStrategy(Patient.authenticate()))
passport.use('local.doctor', new LocalStrategy(Doctor.authenticate()))

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
app.use(expressValidator({
   customValidators: {
      isFile: function (value, filename) {

         var extension = (path.extname(filename)).toLowerCase();
         switch (extension) {
            case '.pdf':
               return '.pdf';
            case '.doc':
               return '.doc';
            case '.docx':
               return '.docx';
            case '.jpg':
               return '.jpg';
            case '.jpeg':
               return '.jpeg';
            case '.png':
               return '.png';
            default:
               return false;
         }
      }
   },
   errorFormatter: function (param, msg, value) {
      var namespace = param.split("."),
         root = namespace.shift(),
         formParam = root;

      while (namespace.length) {
         formParam += "[" + namespace.shift() + "]";
      }
      return {
         param: formParam,
         msg: msg,
         value: value
      };
   }
}));

const isPatientVerified = async function (req, res, next) {
   try {
      const user = await Patient.findOne({ username: req.body.username })
      // console.log('user')
      // console.log(user)
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

const isDoctorVerified = async function (req, res, next) {
   try {
      const user = await Doctor.findOne({ username: req.body.username })
      // console.log('user')
      // console.log(user)
      if (!user) {
         req.flash('danger', 'No account with that email exists.')
         return res.redirect('back')
      }
      if (user.isVerified) {
         return next()
      }
      req.flash(
         'danger',
         'Your account is still under verification! ',
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
         if (err) {
            console.log(err)
         } else {
            io.to(socket.id).emit(
               'myPhotoMessage',
               formatMessage('You', `/images/chatPhotos/${filename}.jpg`),
            )
            socket
               .to(user.room)
               .emit(
                  'otherPhotoMessage',
                  formatMessage(
                     user.username,
                     `/images/chatPhotos/${filename}.jpg`,
                  ),
               )
         }
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

const storage2 = multer.diskStorage({
   destination: (req, file, cb) => {
      if (file.fieldname === 'aadharCard') {
         cb(null, path.join(__dirname, 'public/doctorCertificates/aadharCard'))
      } else if (file.fieldname === 'panCard') {
         cb(null, path.join(__dirname, 'public/doctorCertificates/panCard'))
      } else if (file.fieldname === 'degreeCertificates') {
         cb(
            null,
            path.join(__dirname, 'public/doctorCertificates/degreeCertificates'),
         )
      } else if (file.fieldname === 'digitalKYC') {
         cb(null, path.join(__dirname, 'public/doctorCertificates/digitalKYC'))
      }
   },
   filename: (req, file, cb) => {
      if (file.fieldname === 'aadharCard') {
         cb(null, file.fieldname + Date.now() + path.extname(file.originalname))
      } else if (file.fieldname === 'panCard') {
         cb(null, file.fieldname + Date.now() + path.extname(file.originalname))
      } else if (file.fieldname === 'degreeCertificates') {
         cb(null, file.fieldname + Date.now() + path.extname(file.originalname))
      } else if (file.fieldname === 'digitalKYC') {
         cb(null, file.fieldname + Date.now() + path.extname(file.originalname))
      }
   },
})

const upload2 = multer({
   storage: storage2,
   limits: {
      fileSize: 1024 * 1024 * 10,
   },
   fileFilter: (req, file, cb) => {
      checkFileType(file, cb)
   },
})

function checkFileType(file, cb) {
   if (
      file.fieldname === 'aadharCard' ||
      file.fieldname === 'panCard' ||
      file.fieldname === 'degreeCertificates' ||
      file.fieldname === 'digitalKYC'
   ) {
      if (
         file.mimetype === 'application/pdf' ||
         file.mimetype === 'application/msword' ||
         file.mimetype ===
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
         file.mimetype === 'image/png' ||
         file.mimetype === 'image/jpg' ||
         file.mimetype === 'image/jpeg'
      ) {
         // check file type to be pdf, doc, docx, png, jpg, jpeg
         cb(null, true)
      } else {
         cb(null, false) // else fails
      }
   }
}

var validator = function (req, res, next) {
   req.checkBody('fname', 'First name is required').notEmpty()
   req.checkBody('lname', 'Last name is required').notEmpty()
   req.checkBody('contact', 'Enter a valid Contact No.').isMobilePhone('en-IN')
   req.checkBody('username', 'Enter a valid Email-id').isEmail()
   req.checkBody('pwd', 'Password must be of minimum 6 characters').isLength({
      min: 2,
   })
   req.checkBody('cpwd', 'Passwords do not match').equals(req.body.pwd)
   req.checkBody('speciality', 'Select a specialty').notEmpty()
   req.checkBody('exp', 'Years of Experience is required').notEmpty()
   req.checkBody('fee', 'Consultation Fee is required').notEmpty()
   req.checkBody('location', 'Clinic Location is required').notEmpty()
   req.checkBody('desc', 'Description is required').notEmpty()

   aadhar_Card =
      typeof req.files['aadharCard'] !== 'undefined'
         ? req.files['aadharCard'][0].filename
         : ''
   req.checkBody('aadharCard', 'Aadhar Card is required').isFile(aadhar_Card)

   pan_Card =
      typeof req.files['panCard'] !== 'undefined'
         ? req.files['panCard'][0].filename
         : ''
   req.checkBody('panCard', 'PAN Card is required').isFile(pan_Card)

   grad_Marksheet =
      typeof req.files['degreeCertificates'] !== 'undefined'
         ? req.files['degreeCertificates'][0].filename
         : ''
   req.checkBody('degreeCertificates', 'Graduation Marksheet is required').isFile(
      grad_Marksheet,
   )

   digital_KYC =
      typeof req.files['digitalKYC'] !== 'undefined'
         ? req.files['digitalKYC'][0].filename
         : ''
   req.checkBody('digitalKYC', 'Digital KYC is required').isFile(digital_KYC)

   req.asyncValidationErrors()
      .then(function () {
         next()
      })
      .catch(function (errors) {
         console.log(errors)
         res.status(500).redirect('back')
      })
}

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

const dbSlots = []
async function fetchAppointmentSlots() {
   for (let i = 0; i < 23; i++) {
      let slot = await AppointmentSlot.findOne({ slotId: i + 1 })
      dbSlots.push(slot)
   }
}
fetchAppointmentSlots()

app.post(
   '/doctorRegister',
   upload2.fields([
      {
         name: 'aadharCard',
         maxCount: 1,
      },
      {
         name: 'panCard',
         maxCount: 1,
      },
      {
         name: 'degreeCertificates',
         maxCount: 1,
      },
      {
         name: 'digitalKYC',
         maxCount: 1,
      },
   ]),
   validator,
   async (req, res, next) => {
      try {
         // console.log('doctor register post')
         let errors = req.validationErrors()
         if (req.file == 'undefined' || errors) {
            console.log('No file selected')
            res.render('doctor/doctorRegister.ejs', {
               errors,
            })
         } else {
            // console.log(req.files);
            const aadharCard = req.files.aadharCard[0].filename
            const panCard = req.files.panCard[0].filename
            const degreeCertificates = req.files.degreeCertificates[0].filename
            const digitalKYC = req.files.digitalKYC[0].filename

            // console.log('availableAppointmentSlots')
            const monday = req.body.monday
            const tuesday = req.body.tuesday
            const wednesday = req.body.wednesday
            const thursday = req.body.thursday
            const friday = req.body.friday
            const saturday = req.body.saturday
            const sunday = req.body.sunday

            // console.log(monday)

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
            if (tuesday) {
               tuesday.forEach((slot) => {
                  index = parseInt(slot) - 1
                  tuesdayAvailableAppointmentSlots.push(dbSlots[index]._id)
               })
            }
            if (wednesday) {
               wednesday.forEach((slot) => {
                  index = parseInt(slot) - 1
                  wednesdayAvailableAppointmentSlots.push(dbSlots[index]._id)
               })
            }
            if (thursday) {
               thursday.forEach((slot) => {
                  index = parseInt(slot) - 1
                  thursdayAvailableAppointmentSlots.push(dbSlots[index]._id)
               })
            }
            if (friday) {
               friday.forEach((slot) => {
                  index = parseInt(slot) - 1
                  fridayAvailableAppointmentSlots.push(dbSlots[index]._id)
               })
            }
            if (saturday) {
               saturday.forEach((slot) => {
                  index = parseInt(slot) - 1
                  saturdayAvailableAppointmentSlots.push(dbSlots[index]._id)
               })
            }
            if (sunday) {
               sunday.forEach((slot) => {
                  index = parseInt(slot) - 1
                  sundayAvailableAppointmentSlots.push(dbSlots[index]._id)
               })
            }

            const doctor = new Doctor({
               username: req.body.username,
               usernameToken: crypto.randomBytes(64).toString('hex'),
               isVerified: false,
               first_name: req.body.fname,
               last_name: req.body.lname,
               phone: req.body.contact,
               specialty: req.body.speciality,
               yearsOfExperience: req.body.exp,
               consultationFee: req.body.fee,
               clinicLocation: req.body.location,
               description: req.body.desc,
               aadharCard: aadharCard,
               panCard: panCard,
               degreeCertificates: degreeCertificates,
               digitalKYC: digitalKYC,
               mondayAvailableAppointmentSlots,
               tuesdayAvailableAppointmentSlots,
               wednesdayAvailableAppointmentSlots,
               thursdayAvailableAppointmentSlots,
               fridayAvailableAppointmentSlots,
               saturdayAvailableAppointmentSlots,
               sundayAvailableAppointmentSlots
            })
            const registeredDoctor = await Doctor.register(doctor, req.body.pwd)
            // console.log(registeredDoctor)
            req.flash('success', 'Details received successfully! Your verification process has been started.')
            res.redirect('/doctorRegister')
         }
      } catch (error) {
         console.log('error')
         console.log(error)

         res.redirect('/doctorRegister')
      }

   },
)

app.get('/patientRegister', (req, res) => {
   res.render('patient/patientRegister.ejs')
})

app.get('/patientlogin', (req, res) => {
   res.render('patientlogin.ejs')
})

app.get('/doctorlogin', (req, res) => {
   res.render('doctorlogin.ejs')
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


app.get('/admin/doctors', async (req, res) => {
   try {
      const limitNumber = 20
      const doctors = await Doctor.find({}).limit(limitNumber)
      res.render('doctors.ejs', { doctors })
   } catch (error) {
      res.status(500).send({ message: error.message || 'Error Occured' })
   }
})

app.get('/admin/doctors/:id', async (req, res) => {
   try {
      let doctorId = req.params.id
      const doctor = await Doctor.findById(doctorId)
      res.render('doctor/doctor_verification.ejs', { doctor })
   } catch (error) {
      res.status(500).send({ message: error.message || 'Error Occured' })
   }
})

app.get('/admin/verifydoctor/:id', async (req, res) => {
   try {
      let doctorId = req.params.id
      const doctor = await Doctor.findById(doctorId)
      doctor.isVerified = true
      await doctor.save()
      res.render('doctor/doctor_verification.ejs', { doctor })
   } catch (error) {
      res.status(500).send({ message: error.message || 'Error Occured' })
   }
})

app.get('/admin/deletedoctor/:id', async (req, res) => {
   Doctor.findByIdAndDelete(req.params.id, (err, doc) => {
      if (!err) {
         res.redirect('/admin/doctors')
      } else {
         console.log(err)
      }
   })
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

app.get('/doctor/profile', (req, res) => {
   res.render('doctor/doctor_profile.ejs')
})

app.get('/doctor/profile/edit', (req, res) => {
   res.render('doctor/edit_doctor.ejs')
})

app.get('/patient/profile', (req, res) => {
   res.render('patient/patient_profile.ejs')
})

app.get('/patient/profile/edit', (req, res) => {
   res.render('patient/edit_patient.ejs')
})

app.get('/feedback', (req, res) => {
   res.render('session_over.ejs')
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
         return res.redirect('/patientlogin')
      }
      patient.usernameToken = null
      patient.isVerified = true
      await patient.save()
      req.flash('success', 'Email verified successfully!')
      res.redirect('/patientlogin')
   } catch (error) {
      console.log(error)
      req.flash('danger', 'Token is invalid! Please contact us for assistance.')
      res.redirect('/patientlogin')
   }
})

app.post('/patientlogin', isPatientVerified, (req, res, next) => {
   passport.authenticate('local.patient', {
      failureRedirect: '/patientlogin',
      successRedirect: '/',
      failureFlash: true,
      successFlash: 'Welcome to HealthPlus ' + req.body.username + '!',
   })(req, res, next)
})

app.post('/doctorlogin', isDoctorVerified, (req, res, next) => {
   passport.authenticate('local.doctor', {
      failureRedirect: '/doctorlogin',
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
   res.redirect('/admin/doctors')
})

//Logout
app.get('/logout', (req, res) => {
   req.logout()
   req.flash('success', 'Logged Out Successfully.')
   res.redirect('/')
})

app.get('/appointment/:doctorid', (req, res) => {
   const doctorid = req.params.doctorid
   res.render('patient/appointmentBooking1.ejs', { doctorid })
})

app.get('/:doctorid&:pickedDate', async (req, res) => {

   try {

      const doctor = await Doctor.findById(req.params.doctorid).populate(['mondayAvailableAppointmentSlots',
         'tuesdayAvailableAppointmentSlots',
         'wednesdayAvailableAppointmentSlots',
         'thursdayAvailableAppointmentSlots',
         'fridayAvailableAppointmentSlots',
         'saturdayAvailableAppointmentSlots',
         'sundayAvailableAppointmentSlots',
         'scheduledAppointments'])
      // console.log('doctor')
      // console.log(doctor)
      if (!doctor) {
         req.flash('danger', 'Error.')
         return res.redirect('back')
      }

      const pickedDate = req.params.pickedDate
      // console.log(pickedDate)

      const myDate = moment(pickedDate, 'DD-MM-YYYY').toDate();

      const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      const d = new Date(myDate);
      let day = weekday[d.getDay()];
      // console.log('day')
      // console.log(day)

      let slots = []
      if (day == 'Monday') {
         slots = [...doctor.mondayAvailableAppointmentSlots]
      } else if (day == 'Tuesday') {
         slots = [...doctor.tuesdayAvailableAppointmentSlots]
      } else if (day == 'Wednesday') {
         slots = [...doctor.wednesdayAvailableAppointmentSlots]
      } else if (day == 'Thursday') {
         slots = [...doctor.thursdayAvailableAppointmentSlots]
      } else if (day == 'Friday') {
         slots = [...doctor.fridayAvailableAppointmentSlots]
      } else if (day == 'Saturday') {
         slots = [...doctor.saturdayAvailableAppointmentSlots]
      } else if (day == 'Sunday') {
         slots = [...doctor.sundayAvailableAppointmentSlots]
      }



      slots.sort(function (a, b) { return a.slotId - b.slotId });

      // console.log(myDate)

      // console.log(slots)
      bookedCounter = 0
      doctor.scheduledAppointments.forEach(appointment => {
         // console.log('appointment', appointment)
         // console.log('pickedDate', pickedDate)
         if (appointment.dateOfAppointment == pickedDate) {
            slots.forEach(slot => {
               // console.log('slot', slot)
               if (slot.slotId == appointment.slotId) {

                  slot['booked'] = true
                  bookedCounter += 1
                  return
               }
            })
         }
      })

      slotCount = slots.length - bookedCounter

      // console.log('slots')
      // console.log(slots)


      res.render('patient/appointmentBooking2.ejs', { slots, doctorid: req.params.doctorid, pickedDate: req.params.pickedDate, slotCount })



   } catch (error) {
      console.log(error)
      req.flash(
         'danger',
         'Something went wrong! Please contact us for assistance',
      )
      res.redirect('back')
   }


})


app.post('/bookslot/:doctorid&:pickedDate', async (req, res) => {

   try {

      const { patientName, email, phoneno, mode, message, selectedSlot } = req.body
      // const patientid = req.user._id
      const patientid = '63adfbd04d8f181c14d229b4'
      const doctorid = req.params.doctorid

      // const slot = await AppointmentSlot.findOne({ slotId: req.body.selectedSlot })
      // const dateOfAppointment = moment(req.params.pickedDate, 'DD-MM-YYYY').toDate();

      const appointment = new Appointment({
         patientid, doctorid, patientName, email, phoneno, mode, message, slotId: parseInt(selectedSlot), dateOfAppointment: req.params.pickedDate
      })


      const ap = await appointment.save()

      const doctor = await Doctor.findById(doctorid)
      doctor.scheduledAppointments.push(ap)
      await doctor.save()

      // console.log(ap)

      // res.redirect(/slotBookingSucesss)
      res.redirect('back')


   } catch (error) {
      console.log(error)
      req.flash('danger', 'Something went wrong')
      res.redirect('back')
   }


})



app.get('/:filename', (req, res) => {
   res.download(
      __dirname + '/public/images/prescriptions/' + req.params.filename,
   )
})

const PORT = 3000
app.listen(PORT, () => console.log(`SERVER STARTED AT ${PORT}!`))
