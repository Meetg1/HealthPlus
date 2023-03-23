const express = require('express')
const app = express()
const path = require('path')
const fs = require('fs')
require('dotenv').config()
const ejsMate = require('ejs-mate')
const mongoose = require('mongoose')
const Admin = require('./models/Admin')
const Patient = require('./models/Patient')
const Doctor = require('./models/Doctor')
const AppointmentSlot = require('./models/AppointmentSlot')
const Appointment = require('./models/Appointment')
const Chat = require('./models/Chat')
const Review = require('./models/Review');
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
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const server = http.createServer(app)
const nodemailer = require('nodemailer');
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
      // console.log('chat_prescription')
      // console.log(req.chat_prescription)
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

passport.serializeUser((obj, done) => {
   if (obj instanceof Patient) {
      done(null, { id: obj.id, type: 'Patient' });
   } else {
      done(null, { id: obj.id, type: 'Doctor' });
   }
});

passport.deserializeUser((obj, done) => {
   if (obj.type === 'Patient') {
      Patient.findById(obj.id).then((patient) => done(null, patient));
   } else {
      Doctor.findById(obj.id).then((doctor) => done(null, doctor));
   }
});
// ====================================================================================

//Express Messages Middle ware
app.use(require('connect-flash')())
app.use(function (req, res, next) {
   //giving access of loggedIn user to every templates(in views dir)
   if (req.user) {
      res.locals.currentUser = req.user
   } else {
      res.locals.currentUser = undefined
   }

   // res.locals.currentUserPrefLang = req.user.preferredLanguage
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


// ==========================SOCKET.IO====================================
const { formatMessage, getRoomUsers } = require('./utils/messages')

const users = {}
const chats = {}

io.on('connection', (socket) => {
   socket.on('joinRoom', ({ username, room }) => {
      users[socket.id] = { username: username, room: room }
      Chat.findOne({ appointmentId: room }, (err, foundChat) => {
         if (err) console.error(error)
         else {
            chats[room] = foundChat
         }
      })
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
      // console.log(user.room)
      socket
         .to(user.room)
         .emit('othermessage', formatMessage(user.username, msg))

      // update chat document in DB
      const chat = chats[user.room]
      chat.messages.push(formatMessage(user.username, msg))
      chat.save()
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
   req.checkBody('speciality', 'Select a speciality').notEmpty()
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

app.post('/setPrefLang', async (req, res) => {
   const lang = parseInt(req.body.language)
   try {
      if (req.user instanceof Doctor) {
         let foundUser = await Doctor.findById(req.user._id)
         foundUser.preferredLanguage = lang
         await foundUser.save()
      } else {
         let foundUser = await Patient.findById(req.user._id)
         foundUser.preferredLanguage = lang
         await foundUser.save()
      }

      res.redirect('back')
   } catch (error) {
      console.log(error)
   }
})


app.get('/demo', (req, res) => {
   res.render('translateTest.ejs')
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
               for (let index = 0; index < monday.length; index++) {
                  slot = monday[index]
                  index = parseInt(slot) - 1
                  mondayAvailableAppointmentSlots.push(dbSlots[index]._id)

               }
               // monday.forEach((slot) => {
               //    index = parseInt(slot) - 1
               //    mondayAvailableAppointmentSlots.push(dbSlots[index]._id)
               // })
            }
            if (tuesday) {
               for (let index = 0; index < tuesday.length; index++) {
                  slot = tuesday[index]
                  index = parseInt(slot) - 1
                  tuesdayAvailableAppointmentSlots.push(dbSlots[index]._id)

               }
            }
            if (wednesday) {
               for (let index = 0; index < wednesday.length; index++) {
                  slot = wednesday[index]
                  index = parseInt(slot) - 1
                  wednesdayAvailableAppointmentSlots.push(dbSlots[index]._id)

               }
            }
            if (thursday) {
               for (let index = 0; index < thursday.length; index++) {
                  slot = thursday[index]
                  index = parseInt(slot) - 1
                  thursdayAvailableAppointmentSlots.push(dbSlots[index]._id)

               }
            }
            if (friday) {
               for (let index = 0; index < friday.length; index++) {
                  slot = friday[index]
                  index = parseInt(slot) - 1
                  fridayAvailableAppointmentSlots.push(dbSlots[index]._id)

               }
            }
            if (saturday) {
               for (let index = 0; index < saturday.length; index++) {
                  slot = saturday[index]
                  index = parseInt(slot) - 1
                  saturdayAvailableAppointmentSlots.push(dbSlots[index]._id)

               }
            }
            if (sunday) {
               for (let index = 0; index < sunday.length; index++) {
                  slot = sunday[index]
                  index = parseInt(slot) - 1
                  sundayAvailableAppointmentSlots.push(dbSlots[index]._id)

               }
            }

            const doctor = new Doctor({
               username: req.body.username,
               usernameToken: crypto.randomBytes(64).toString('hex'),
               isVerified: false,
               first_name: req.body.fname,
               last_name: req.body.lname,
               phone: req.body.contact,
               speciality: req.body.speciality,
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
   res.render('patient/patientlogin.ejs')
})

app.get('/doctorlogin', (req, res) => {
   res.render('doctor/doctorlogin.ejs')
})

app.get('/admin_login', (req, res) => {
   res.render('adminLogin.ejs')
})

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
app.post('/searchbar', (req, res) => {
   const searchbar = req.body.searchbar;
   // console.log(searchbar);
   Doctor.find({
      $or: [
         { first_name: { $regex: new RegExp(searchbar, "i") } },
         { last_name: { $regex: new RegExp(searchbar, "i") } },
         { speciality: { $regex: new RegExp(searchbar, "i") } },
         // ... add more properties to search as needed
      ]
   }, (err, response) => {
      if (err) {
         console.log(err);
         res.send(err);
      } else {
         res.render('doctor_search.ejs', { doctors: response });
      }
   });
})
let filter = {};
app.post('/search', (req, res) => {
   const speciality = req.body.speciality;
   const fee = req.body.fee;
   const experience = req.body.experience;
   // console.log(speciality);
   // console.log(fee);
   // console.log(experience);
   // const dropdown = document.getElementById("speciality");
   // const selectedOption = dropdown.options[dropdown.selectedIndex].value;

   // const dropdown1 = document.getElementById("fee");
   // const selectedOption1 = dropdown1.options[dropdown1.selectedIndex].value;
   // const string = selectedOption1;
   const range = fee.split("-");

   const lowerBound = Number(range[0]);
   const upperBound = Number(range[1]);

   const feeobj = {
      $gt: lowerBound,
      $lt: upperBound
   };

   // const dropdown2 = document.getElementById("exp");
   // const selectedOption2 = dropdown2.options[dropdown2.selectedIndex].value;
   // const string2 = selectedOption2;
   const range2 = experience.split("-");

   const lowerBound2 = Number(range2[0]);
   const upperBound2 = Number(range2[1]);

   const expobj = {
      $gt: lowerBound2,
      $lt: upperBound2
   };
   filter = {
      specialty: speciality,
      consultationFee: feeobj,
      yearsOfExperience: expobj
   };
   // console.log(filter);
   res.redirect('/search');
})
app.get('/search', (req, res) => {
   axios
      .get('http://localhost:3000/searchdoc')
      .then(function (response) {
         // console.log(response.data)
         res.render('doctor_search.ejs', { doctors: response.data })
      })
      .catch((err) => {
         res.send(err)
      })
})
app.get('/searchdoc', (req, res) => {
   Doctor.find(filter)
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
let curr_docid = "";
app.post('/doctor_specific/:doctorid', (req, res, next) => {
   curr_docid = req.params.doctorid;
   res.redirect('/doctor_specific/profile');
})

app.get('/doctor_specific/profile', async function (req, res, next) {
   try {
      const Id = curr_docid;
      const doc = await Doctor.findOne({ _id: Id });
      const doctorId = doc._id;
      const doctor = await Doctor.findById(doctorId).populate('mondayAvailableAppointmentSlots').populate('tuesdayAvailableAppointmentSlots').populate('wednesdayAvailableAppointmentSlots').populate('thursdayAvailableAppointmentSlots').populate('fridayAvailableAppointmentSlots').populate('saturdayAvailableAppointmentSlots').populate('sundayAvailableAppointmentSlots');
      console.log(doctor.wednesdayAvailableAppointmentSlots[0]);
      const review = await Review.find({ doctorid: doctorId });

      // Cancel Appointment
      // let patientid = curr_docid;
      // const patient = await Doctor.findById(patientid);
      // console.log(patient.scheduledAppointments);
      // const appointment = await Appointment.find({ doctorid: patientid })
      // let arr = [];
      // appointment.forEach(async function (item) {
      //    console.log(item._id);
      //    const time = await AppointmentSlot.findOne({ slotId: item.slotId });
      //    arr.push({ date: item.dateOfAppointment, time: time.slotTime, id: item._id })
      // });
      // const slots = await AppointmentSlot.find({ slotId: appointment.slotId });
      // console.log(appointment._id);
      const tempdoctor = await Doctor.find(doctorId);
      const oldrating = tempdoctor[0].ratings;
      res.render('doctor/doctor_specific.ejs', { doctor: doctor, monday: doctor.mondayAvailableAppointmentSlots, tuesday: doctor.tuesdayAvailableAppointmentSlots, wednesday: doctor.wednesdayAvailableAppointmentSlots, thursday: doctor.thursdayAvailableAppointmentSlots, friday: doctor.fridayAvailableAppointmentSlots, saturday: doctor.saturdayAvailableAppointmentSlots, sunday: doctor.sundayAvailableAppointmentSlots, review: review, rating: oldrating })
   } catch (error) {
      res.status(500).send({ message: error.message || 'Error Occured' })
   }
})


function loggedInDoctor(req, res, next) {
   if (req.user instanceof Doctor) {
      next();
   }
   // else if (req.user instanceof Patient) {
   //    next()
   // }
   else {
      res.redirect('/doctorlogin');
   }
}

function loggedInPatient(req, res, next) {
   if (req.user instanceof Patient) {
      next();
   }
   else {
      res.redirect('/patientlogin');
   }
}
// app.get('/cancel_appointment_patient', loggedInPatient, async function (req, res, next) {
//    try {
//       let patientid = req.user._id;
//       const patient = await Patient.findById(patientid);
//       console.log(patient.scheduledAppointments);
//       const appointment = await Appointment.find({ patientid: patientid })
//       let arr = [];
//       appointment.forEach(async function (item) {
//          console.log(item._id);
//          const time = await AppointmentSlot.findOne({ slotId: item.slotId });
//          arr.push({ date: item.dateOfAppointment, time: time.slotTime, id: item._id })
//       });
//       const slots = await AppointmentSlot.find({ slotId: appointment.slotId });
//       console.log(appointment._id);
//       res.render('patient/patient_profile.ejs', { appointment: appointment, slots: arr });
//    } catch (error) {
//       res.status(500).send({ message: error.message || 'Error Occured' })
//    }
// })
app.post('/cancel_appointment', async function (req, res, next) {
   const data = req.body.id;
   console.log(data);
   await Appointment.findByIdAndDelete(data);
   res.render('home.ejs');
})

app.get('/doctor/profile', loggedInDoctor, async function (req, res, next) {
   try {
      let doctorId = req.user._id;
      const doctor = await Doctor.findById(doctorId).populate('mondayAvailableAppointmentSlots').populate('tuesdayAvailableAppointmentSlots').populate('wednesdayAvailableAppointmentSlots').populate('thursdayAvailableAppointmentSlots').populate('fridayAvailableAppointmentSlots').populate('saturdayAvailableAppointmentSlots').populate('sundayAvailableAppointmentSlots');
      console.log(doctor.wednesdayAvailableAppointmentSlots[0]);
      const review = await Review.find({ doctorid: doctorId });

      // Cancel Appointment
      let patientid = req.user._id;
      const patient = await Doctor.findById(patientid);
      console.log(patient.scheduledAppointments);
      const appointment = await Appointment.find({ doctorid: patientid })
      let arr = [];
      appointment.forEach(async function (item) {
         console.log(item._id);
         const time = await AppointmentSlot.findOne({ slotId: item.slotId });
         arr.push({ date: item.dateOfAppointment, time: time.slotTime, id: item._id })
      });
      const slots = await AppointmentSlot.find({ slotId: appointment.slotId });
      console.log(appointment._id);
      const tempdoctor = await Doctor.find(doctorId);
      const oldrating = tempdoctor[0].ratings;
      res.render('doctor/doctor_profile.ejs', { doctor: doctor, monday: doctor.mondayAvailableAppointmentSlots, tuesday: doctor.tuesdayAvailableAppointmentSlots, wednesday: doctor.wednesdayAvailableAppointmentSlots, thursday: doctor.thursdayAvailableAppointmentSlots, friday: doctor.fridayAvailableAppointmentSlots, saturday: doctor.saturdayAvailableAppointmentSlots, sunday: doctor.sundayAvailableAppointmentSlots, review: review, appointment: appointment, slots: arr, rating: oldrating })
   } catch (error) {
      res.status(500).send({ message: error.message || 'Error Occured' })
   }
})

app.get('/doctor/profile/edit', loggedInDoctor, function (req, res, next) {
   res.render('doctor/edit_doctor.ejs')
})

app.get('/patient/profile', loggedInPatient, async function (req, res, next) {
   try {
      let patientid = req.user._id;
      const patient = await Patient.findById(patientid);
      console.log(patient.scheduledAppointments);
      const appointment = await Appointment.find({ patientid: patientid })
      let arr = [];
      appointment.forEach(async function (item) {
         console.log(item._id);
         const time = await AppointmentSlot.findOne({ slotId: item.slotId });
         arr.push({ date: item.dateOfAppointment, time: time.slotTime, id: item._id })
      });
      const slots = await AppointmentSlot.find({ slotId: appointment.slotId });
      console.log(appointment._id);
      res.render('patient/patient_profile.ejs', { patient: patient, appointment: appointment, slots: arr });
   } catch (error) {
      res.status(500).send({ message: error.message || 'Error Occured' })
   }
})

app.get('/patient/profile/edit', loggedInPatient, function (req, res, next) {
   res.render('patient/edit_patient.ejs')
})

app.get('/feedback/:appointmentid', async (req, res) => {
   const appointmentid = req.params.appointmentid;
   console.log(appointmentid);
   const document = await Appointment.findOne({ _id: appointmentid });
   const doctorid = document.doctorid;
   console.log(doctorid);
   const review = await Review.find({ doctorid: doctorid });
   console.log(review);
   const tempdoctor = await Doctor.find(doctorid);
   const oldrating = tempdoctor[0].ratings;
   res.render('session_over.ejs', { appointmentid: appointmentid, review: review, rating: oldrating });
})
app.post('/feedback/:appointmentid', async (req, res) => {
   const rating = req.body.rating;
   const consult = req.body.ConsultReason;
   const feedback = req.body.Feedback;
   const appointmentid = req.params.appointmentid;
   const document = await Appointment.findOne({ _id: appointmentid });
   const doctorid = document.doctorid;
   const patient_name = document.patientName;
   const reviews = await Review.find({ doctorid: doctorid });
   const no_of_review = (await reviews).length;
   const tempdoctor = await Doctor.find(doctorid);
   const oldrating = tempdoctor[0].ratings;
   const id = doctorid.toString();
   console.log(no_of_review);
   console.log(oldrating);
   console.log(rating);
   const newrating = Math.round(((oldrating * no_of_review) + Number(rating)) / (no_of_review + 1));
   console.log(newrating);
   Doctor.updateOne({ _id: id }, { $set: { ratings: newrating } }, // update
      { new: true }, // options
      function (err, doc) {
         if (err) throw err;
         console.log(doc);
      });
   // const patient_document = await Patient.findOne({ _id: patientid });
   // const patient_name = patient_document.first_name;
   const temp = req.body.select;
   const recommend = JSON.parse(temp);
   // console.log(rating);
   // console.log(consult);
   // console.log(feedback);
   // console.log(doctorid);
   // console.log(recommend);
   // console.log(patient_name);
   try {
      const newDocument = await Review.create({
         rating: rating,
         consult: consult,
         feedback: feedback,
         doctorid: doctorid,
         recommend: recommend,
         patientname: patient_name,
      });
      res.status(200).render('home.ejs');
   } catch (err) {
      res.status(500).send(err.message);
   }
   // res.send("Submitted");
})

app.get('/register/success', (req, res) => {
   res.render('register_success.ejs')
})

app.get('/register/pending', (req, res) => {
   res.render('register_pending.ejs')
})

app.post('/patientRegister', async (req, res) => {
   try {
      const { username, fname, lname, phone, gender, age, location, pswd } = req.body
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
            age: age,
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
         const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // use SSL
            auth: {
               user: 'healthplus182@gmail.com', // your email address
               pass: 'aiwqesgsnywrsrcu' // your email password
            }
         });
         const mailOptions = {
            from: 'healthplus182@gmail.com',
            to: username,
            subject: 'Verify your email address',
            html: `Please click this link to verify your email address: <a href="${link}">${link}</a>`
         };
         transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
               console.log(error);
            } else {
               console.log('Email sent: ' + info.response);
            }
         });
         sendverifyMail(username, link).then((result) =>
            console.log('Email sent....', result),
         )
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
      const patientid = req.user._id
      // const patientid = '63adfbd04d8f181c14d229b4'
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


app.get(
   '/chat_appointment/:appointmentid&:username&:usertype',
   async (req, res) => {

      try {

         const appointmentid = req.params.appointmentid

         if (!mongoose.isValidObjectId(appointmentid))
            return res.send('No Appointment found')

         const foundAppointment = await Appointment.findById(appointmentid)
         if (!foundAppointment) {
            req.flash('danger', 'No appointment found!')
            return res.redirect('back')
         }

         var usertype
         if (req.user instanceof Doctor) {  // if specilaity field exists,user is a doctor else a patient
            usertype = 'doctor'
         }
         else {
            usertype = 'patient'
         }

         const fullname = `${req.user.first_name} ${req.user.last_name}`
         const patientid = foundAppointment.patientid

         let chatMessages = []

         // create Chat object in DB if opening chat for first time
         let foundChat = await Chat.findOne({ appointmentId: appointmentid })
         if (!foundChat) {
            await Chat.create({ appointmentId: appointmentid })
         } else {
            chatMessages = foundChat.messages
         }

         res.render('chat.ejs', {
            username: fullname,
            room: appointmentid,
            usertype: usertype,
            patientid: patientid,
            chatMessages: chatMessages,
            appointmentid: appointmentid
         })

      } catch (error) {
         console.log(error)
         req.flash('danger', 'Something went wrong')
         res.redirect('back')
      }

   }
)

const generatePrescriptionTemplate = async (req, res, next) => {

   // Load the docx file as binary content
   const content = fs.readFileSync(
      path.resolve(__dirname, "prescription_template.docx"),
      "binary"
   );

   const zip = new PizZip(content);

   const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
   });

   // Render the document (Replace {first_name} by John, {last_name} by Doe, ...)
   // console.log('req.body')
   // console.log(req.body)
   const patient = await Patient.findById(req.body.patientid)
   // console.log(patient)

   const doctor = req.user
   const diag = []
   const meds = []

   for (let index = 0; index < req.body.diagnosis.length; index++) {
      diag.push({ "name": req.body.diagnosis[index], "comment": req.body.diagnosis_comment[index] })
   }

   for (let index = 0; index < req.body.medicineName.length; index++) {
      meds.push({ "name": req.body.medicineName[index], "dosage": req.body.dosage[index] })
   }

   prescriptionJSON = {
      "date": moment().format("DD/MM/YYYY"),
      "dr_fname": doctor.first_name,
      "dr_lname": doctor.last_name,
      "dr_speciality": doctor.specialty,
      "dr_clinic_location": doctor.clinicLocation,
      "patient_name": patient.first_name + ' ' + patient.last_name,
      "patient_age": patient.age,
      "patient_gender": patient.gender,
      "diag": diag,
      "meds": meds,
      "info": req.body.info
   }

   doc.render(prescriptionJSON);

   const buf = doc.getZip().generate({
      type: "nodebuffer",
      // compression: DEFLATE adds a compression step.
      // For a 50MB output document, expect 500ms additional CPU time
      compression: "DEFLATE",
   });

   // buf is a nodejs Buffer, you can either write it to a
   // file or res.send it with express for example.
   let filename = patient.first_name + '_' + patient.last_name + '_prescription.docx'
   fs.writeFileSync(path.resolve(__dirname, 'public/images/prescriptions', filename), buf);
   req.chat_prescription = filename
   next()
}

app.post(
   '/:appointmentid/uploadChatPrescription',
   generatePrescriptionTemplate,
   // upload.single('chat_prescription'),
   async (req, res) => {
      try {
         const appointment = await Appointment.findById(req.params.appointmentid)
         // console.log(req.file)
         // const file = req.file
         // if (!file) {
         //    req.flash('danger', 'Please select a file first.')
         //    return res.redirect('back')
         // }

         appointment.prescription = req.chat_prescription
         appointment.save()

         // console.log(req)
         res.send({ status: 'success', filename: req.chat_prescription })

      } catch (error) {
         console.log(error)
      }
   },
)

app.get('/:filename', (req, res) => {
   res.download(
      __dirname + '/public/images/prescriptions/' + req.params.filename,
   )
})

const PORT = 3000
app.listen(PORT, () => console.log(`SERVER STARTED AT ${PORT}!`))
