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
const Speciality = require('./models/Speciality')
const Appointment = require('./models/Appointment')
const Chat = require('./models/Chat')
const Review = require('./models/Review');
const Notification = require('./models/Notification');
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
const { readdir } = require('fs/promises');
const specialities = require('./specialities')
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
app.use(async function (req, res, next) {
   //giving access of loggedIn user to every templates(in views dir)
   if (req.user) {
      res.locals.currentUser = req.user
   } else {
      res.locals.currentUser = undefined
   }
   //giving access of loggedIn user's notifications to every templates(in views dir) (have to populate first though)
   if (req.user) {
      try {
         if (req.user instanceof Doctor) {
            const user = await Doctor.findById(req.user._id)
               .populate('notifications')
               .exec()
            res.locals.notifications = user.notifications.reverse() //latest notifications first
         }
         else {
            const user = await Patient.findById(req.user._id)
               .populate('notifications')
               .exec()
            res.locals.notifications = user.notifications.reverse() //latest notifications first
         }


      } catch (error) {
         console.error(error.message)
      }
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

// =================MIDDLEWARES=========================
const isLoggedIn = (req, res, next) => {
   if (!req.isAuthenticated()) {
      req.flash('danger', 'Please Log In First!')
      return res.redirect('back')
   }
   next()
}

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

const { PDFNet } = require('@pdftron/pdfnet-node');
const PDFNetEndpoint = (main, inputPath, outputPath, res) => {
   PDFNet.runWithCleanup(main, process.env.PDFNET_KEY)
      .then(() => {
         PDFNet.shutdown();

         //deleting word file
         let pathToFile = inputPath
         //console.log("path: "+pathToFile)
         fs.unlink(pathToFile, function (err) {
            if (err) {
               throw err
            } else {
               // console.log('Successfully deleted the file : ' + pathToFile)
            }
         })
         // fs.readFile(, (err, data) => {
         //    if (err) {
         //       res.statusCode = 500;
         //       res.end(`Error getting the file: ${err}.`);
         //    } else {
         //       res.setHeader('Content-type', 'application/pdf');
         //       res.end(data);
         //    }
         // });
      })
      .catch((error) => {
         res.statusCode = 500;
         res.end(error);
      });
};

// generatePrescriptionTemplate AND ADD record to BLOCKCHAIN
const generatePrescriptionTemplate = async (req, res, next) => {
   const patientId = req.body.patientid
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
   const patient = await Patient.findById(patientId)
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
   const date = moment().format("DD-MM-YYYY")
   const prescID = uuidv1()
   prescriptionJSON = {
      "date": date,
      "dr_fname": doctor.first_name,
      "dr_lname": doctor.last_name,
      "dr_speciality": doctor.speciality,
      "dr_uprn": doctor.uprn,
      "dr_clinic_location": doctor.clinicLocation,
      "patient_name": patient.first_name + ' ' + patient.last_name,
      "patient_age": patient.age,
      "patient_gender": patient.gender,
      "diag": diag,
      "meds": meds,
      "info": req.body.info,
      "prescID": prescID
   }
   // console.log('prescriptionJSON')
   // console.log(prescriptionJSON)
   doc.render(prescriptionJSON);

   const buf = doc.getZip().generate({
      type: "nodebuffer",
      // compression: DEFLATE adds a compression step.
      // For a 50MB output document, expect 500ms additional CPU time
      compression: "DEFLATE",
   });

   // buf is a nodejs Buffer, you can either write it to a
   // file or res.send it with express for example.
   let filename = patient.first_name + '_' + patient.last_name + '_' + date + '_' + prescID + '_prescription.docx'
   fs.writeFileSync(path.resolve(__dirname, 'public/images/prescriptions', filename), buf);

   // convert word to pdf
   try {
      const inputPath = path.resolve(__dirname, 'public/images/prescriptions', filename);
      const outputPath = path.resolve(__dirname, `public/images/prescriptions/${filename.slice(0, -5)}.pdf`);
      const main = async () => {
         const pdfdoc = await PDFNet.PDFDoc.create();
         await pdfdoc.initSecurityHandler();
         await PDFNet.Convert.toPdf(pdfdoc, inputPath);
         pdfdoc.save(
            outputPath,
            PDFNet.SDFDoc.SaveOptions.e_linearized);
      };
      PDFNetEndpoint(main, inputPath, outputPath, res);

      filename = patient.first_name + '_' + patient.last_name + '_' + date + '_' + prescID + '_prescription.pdf'
      req.chat_prescription = filename

   } catch (error) {
      console.log(error)
   }

   //  ADD RECORD TO BLOCKCHAIN IF CONSENT

   try {
      if (patient.blockchainConsent) {
         const record = {
            doctor: { name: doctor.first_name + ' ' + doctor.last_name, id: doctor.id },
            patient: patientId,
            data: {
               date: prescriptionJSON.date,
               diagnosis: prescriptionJSON.diag,
               medicines: prescriptionJSON.meds,
               suggestions: prescriptionJSON.info,
               prescription: filename,
               reports: ""
            }
         }
         axios
            .post(`http://localhost:5000/blockchain/insertTransaction`, record)
            .then((response) => {
               console.log(response.data);
            })
            .catch((error) => {
               console.log(error);
            });
      }
   } catch (error) {
      console.log(error);
   }

   next()
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
      } else if (file.fieldname === 'profilePic') {
         cb(null, path.join(__dirname, 'public/images/doctorProfilePics/'))
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
      } else if (file.fieldname === 'profilePic') {
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
      file.fieldname === 'profilePic' ||
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

const storage3 = multer.diskStorage({
   destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'public/patientReports'))
   },
   filename: (req, file, cb) => {
      cb(null, file.fieldname + Date.now() + path.extname(file.originalname))
   },
})

const upload3 = multer({
   storage: storage3,
})

var validator = function (req, res, next) {
   req.checkBody('fname', 'First name is required').notEmpty()
   req.checkBody('lname', 'Last name is required').notEmpty()
   req.checkBody('contact', 'Enter a valid Contact No.').isMobilePhone('en-IN')
   req.checkBody('username', 'Enter a valid Email-id').isEmail()
   req.checkBody('pwd', 'Password must be of minimum 6 characters').isLength({
      min: 2,
   })
   req.checkBody('cpwd', 'Passwords do not match').equals(req.body.pwd)
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

   profile_Pic =
      typeof req.files['profilePic'] !== 'undefined'
         ? req.files['profilePic'][0].filename
         : ''
   req.checkBody('profilePic', 'Profile Pic is required').isFile(profile_Pic)

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
   res.render('doctor/doctorRegister.ejs', { specialities })
})

const dbSlots = []
async function fetchAppointmentSlots() {
   for (let i = 0; i < 23; i++) {
      let slot = await AppointmentSlot.findOne({ slotId: i + 1 })
      dbSlots.push(slot)
   }
}
fetchAppointmentSlots()

// const dbSpecialities = []
// async function fetchSpecialityTypes() {
//    for (let i = 0; i < 9; i++) {
//       let spec = await Speciality.findOne({ specId: i + 1 })
//       dbSpecialities.push(spec)
//    }
// }
// fetchSpecialityTypes()

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
         maxCount: 5,
      },
      {
         name: 'profilePic',
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
            const profilePic = req.files.profilePic[0].filename
            const digitalKYC = req.files.digitalKYC[0].filename

            // console.log('availableAppointmentSlots')
            // const specType = req.body.specType
            const monday = req.body.monday
            const tuesday = req.body.tuesday
            const wednesday = req.body.wednesday
            const thursday = req.body.thursday
            const friday = req.body.friday
            const saturday = req.body.saturday
            const sunday = req.body.sunday

            // console.log(monday)

            // const speciality = []
            const mondayAvailableAppointmentSlots = []
            const tuesdayAvailableAppointmentSlots = []
            const wednesdayAvailableAppointmentSlots = []
            const thursdayAvailableAppointmentSlots = []
            const fridayAvailableAppointmentSlots = []
            const saturdayAvailableAppointmentSlots = []
            const sundayAvailableAppointmentSlots = []

            // console.log('specType')
            // console.log(specType)
            // console.log('dbSpecialities')
            // console.log(dbSpecialities)

            // if (specType) {
            //    for (let index = 0; index < specType.length; index++) {
            //       spec = specType[index]
            //       index = parseInt(spec) - 1
            //       speciality.push(dbSpecialities[index]._id)
            //    }
            // }

            // console.log('speciality')
            // console.log(speciality)

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


            setTimeout(async () => {
               const doctor = new Doctor({
                  username: req.body.username,
                  usernameToken: crypto.randomBytes(64).toString('hex'),
                  isVerified: false,
                  first_name: req.body.fname,
                  last_name: req.body.lname,
                  phone: req.body.contact,
                  speciality: req.body.specType,
                  yearsOfExperience: req.body.exp,
                  consultationFee: req.body.fee,
                  clinicLocation: req.body.location,
                  description: req.body.desc,
                  uprn: req.body.uprn,
                  aadharCard: aadharCard,
                  panCard: panCard,
                  degreeCertificates: degreeCertificates,
                  profilePic: profilePic,
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
               // console.log(speciality)
               req.flash('success', 'Details received successfully! Your verification process has been started.')
               res.redirect('/doctorRegister')
            }, 3000);

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
      res.render('doctorApplications.ejs', { doctors })
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
         { clinicLocation: { $regex: new RegExp(searchbar, "i") } },
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
   let speciality = false
   if (req.body.speciality) {
      speciality = req.body.speciality
   }
   const fee = req.body.fee;
   const experience = req.body.experience;
   const location = req.body.location;
   // console.log(speciality);
   // console.log(fee);
   // console.log(experience);
   // const dropdown = document.getElementById("speciality");
   // const selectedOption = dropdown.options[dropdown.selectedIndex].value;

   // const dropdown1 = document.getElementById("fee");
   // const selectedOption1 = dropdown1.options[dropdown1.selectedIndex].value;
   // const string = selectedOption1;

   let feeobj = false
   let expobj = false

   if (fee) {
      const range = fee.split("-");
      const lowerBound = Number(range[0]);
      const upperBound = Number(range[1]);

      feeobj = {
         $gt: lowerBound - 1,
         $lt: upperBound
      };
   }




   // const dropdown2 = document.getElementById("exp");
   // const selectedOption2 = dropdown2.options[dropdown2.selectedIndex].value;
   // const string2 = selectedOption2;
   if (experience) {
      const range2 = experience.split("-");

      const lowerBound2 = Number(range2[0]);
      const upperBound2 = Number(range2[1]);

      expobj = {
         $gt: lowerBound2 - 1,
         $lt: upperBound2
      };
   }

   filter = {}

   if (speciality) {
      filter['speciality'] = speciality
   }
   if (feeobj) {
      filter['consultationFee'] = feeobj
   }
   if (expobj) {
      filter['yearsOfExperience'] = expobj
   }
   if (location) {
      filter['clinicLocation'] = location
   }

   // filter = {
   //    speciality: { $in: [speciality] },
   //    consultationFee: feeobj,
   //    yearsOfExperience: expobj,
   //    location: location
   // };
   // console.log('filter');
   // console.log(filter);
   res.redirect('/search');
})
app.get('/search', (req, res) => {
   axios
      .get('http://localhost:3000/searchdoc')
      .then(function (response) {
         // console.log(response.data)
         res.render('doctor_search.ejs', { doctors: response.data })
         filter = {};
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

app.get('/doctor_specific/profile/:doctorId', async function (req, res, next) {
   try {
      const Id = req.params.doctorId;
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


app.get('/cancel_appointment/:appointmentid', isLoggedIn, async function (req, res, next) {
   try {
      if (req.user instanceof Doctor) {
         const appointmentid = req.params.appointmentid;
         const appointment = await Appointment.findOne({ _id: appointmentid });
         const patient = await Patient.findById(appointment.patientid)
         const filter = { _id: patient._id };
         const update = { $set: { wallet: patient.wallet + appointment.fees } };
         await Patient.updateOne(filter, update);
         await Appointment.findByIdAndDelete(appointmentid);
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
            to: patient.username,
            subject: 'Appointment Cancel',
            html: `Your Appointment with Dr. "${req.user.first_name}" has been cancelled by the doctor, extremely sorry for the inconvenience.`
         };
         transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
               console.log(error);
            } else {
               console.log('Email sent: ' + info.response);
            }
         });

         let newNotification = {
            username: patient.username,
            message: `Your Appointment with Dr. ${req.user.first_name} is cancelled`,
            icon: 'bell',
         }
         let notification = await Notification.create(newNotification)
         patient.notifications.push(notification)
         await patient.save()

         req.flash('success', 'Appointment has been cancelled.')
         res.redirect('/profile');
      }
      else if (req.user instanceof Patient) {
         const appointmentid = req.params.appointmentid;
         const appointment = await Appointment.findOne({ _id: appointmentid });
         const patient = await Patient.findById(appointment.patientid)
         const doctor = await Doctor.findById(appointment.doctorid)
         const appointment_date = appointment.dateOfAppointment
         const curr_date = new Date();
         const date1Str = moment(curr_date).format('DD-MM-YYYY');
         const date2Str = appointment_date
         const date1 = new Date(date1Str.split('-').reverse().join('-'));
         const date2 = new Date(date2Str.split('-').reverse().join('-'));
         const diffTime = Math.abs(date2 - date1); // Get the difference in milliseconds
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
         console.log(diffDays);
         const filter = { _id: patient._id };
         const filter1 = { _id: doctor._id };
         let update;
         let update1;
         if (diffDays > 2) {
            update = { $set: { wallet: patient.wallet + (appointment.fees * 0.85) } };
            update1 = { $set: { wallet: doctor.wallet + (appointment.fees * 0.15) } };
         } else if (diffDays == 2 || diffDays == 1) {
            update = { $set: { wallet: patient.wallet + (appointment.fees * 0.70) } };
            update1 = { $set: { wallet: doctor.wallet + (appointment.fees * 0.30) } };
         } else {
            update = { $set: { wallet: patient.wallet + (appointment.fees * 0.50) } };
            update1 = { $set: { wallet: doctor.wallet + (appointment.fees * 0.50) } };
         }
         await Patient.updateOne(filter, update);
         await Doctor.updateOne(filter1, update1);
         await Appointment.findByIdAndDelete(appointmentid);
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
            to: doctor.username,
            subject: 'Appointment Cancel',
            html: `Your Appointment with Patient "${req.user.first_name}" has been cancelled by the patient, extremely sorry for the inconvenience. The penalty incurred by the patient has been credited to your wallet.`
         };
         transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
               console.log(error);
            } else {
               console.log('Email sent: ' + info.response);
            }
         });

         let newNotification = {
            username: doctor.username,
            message: `Your Appointment with Patient ${req.user.first_name} is cancelled`,
            icon: 'bell',
         }
         let notification = await Notification.create(newNotification)
         doctor.notifications.push(notification)
         await doctor.save()

         req.flash('success', 'Appointment has been cancelled.')
         res.redirect('/profile');
      }
   } catch (error) {
      res.status(500).send({ message: error.message || 'Error Occured' })
   }

})

app.get('/profile', isLoggedIn, async function (req, res, next) {
   try {
      if (req.user instanceof Doctor) {
         let doc = req.user;
         let doctorId = req.user._id;
         const doctor = await Doctor.findById(doctorId).populate('mondayAvailableAppointmentSlots').populate('tuesdayAvailableAppointmentSlots').populate('wednesdayAvailableAppointmentSlots').populate('thursdayAvailableAppointmentSlots').populate('fridayAvailableAppointmentSlots').populate('saturdayAvailableAppointmentSlots').populate('sundayAvailableAppointmentSlots').populate('speciality');
         // const doctorSpec = await Doctor.findById(doctorId).populate('speciality')
         // console.log(doctor.wednesdayAvailableAppointmentSlots[0]);
         const review = await Review.find({ doctorid: doctorId });

         let patientid = req.user._id;
         const patient = await Doctor.findById(patientid);
         // console.log(patient.scheduledAppointments);
         const doctorAppointments = await Appointment.find({ doctorid: patientid })
         let arr = [];
         for (const item of doctorAppointments) {
            // console.log(item._id);
            const time = await AppointmentSlot.findOne({ slotId: item.slotId });
            const patient = await Patient.findById(item.patientid);
            arr.push({ date: item.dateOfAppointment, time: time.slotTime, id: item._id, patient: patient })
         }
         const tempdoctor = await Doctor.find(doctorId);
         const oldrating = tempdoctor[0].ratings;

         // const doctorSpeciality = await Speciality.find({ specId })
         let newArr = []
         // const 
         for (i = 0; i < doctor.speciality.length; i++) {
            const specs = await Speciality.findOne({ specId: doctor.speciality[i].specId });
            newArr.push(doctor.speciality[i].specialType)
            // console.log(doctor.speciality[i])
         }
         console.log(newArr)
         // console.log(doctor.speciality)
         // conso]
         res.render('doctor/doctor_profile.ejs', { doctor: doctor, speciality: newArr, monday: doctor.mondayAvailableAppointmentSlots, tuesday: doctor.tuesdayAvailableAppointmentSlots, wednesday: doctor.wednesdayAvailableAppointmentSlots, thursday: doctor.thursdayAvailableAppointmentSlots, friday: doctor.fridayAvailableAppointmentSlots, saturday: doctor.saturdayAvailableAppointmentSlots, sunday: doctor.sundayAvailableAppointmentSlots, review: review, doctorAppointments: doctorAppointments, slots: arr, rating: oldrating })
      }
      else if (req.user instanceof Patient) {
         let patientid = req.user._id;
         const patient = await Patient.findById(patientid);
         const patientAppointments = await Appointment.find({ patientid: patientid })

         let arr = [];
         for (const item of patientAppointments) {
            // console.log(item._id);
            const time = await AppointmentSlot.findOne({ slotId: item.slotId });
            const doctor = await Doctor.findById(item.doctorid);
            arr.push({ date: item.dateOfAppointment, time: time.slotTime, id: item._id, doctorname: doctor.first_name, doctorid: doctor._id })
         }
         res.render('patient/patient_profile.ejs', { patient: patient, slots: arr, patientAppointments: patientAppointments });
      }
   } catch (error) {
      res.status(500).send({ message: error.message || 'Error Occured' })
   }
})

// app.get('/patient/profile/edit', loggedInPatient, function (req, res, next) {
//    res.render('patient/edit_patient.ejs')
// })

// Payment through Stripe
// var Publishable_Key = 'pk_test_51IcQRZSAJlPHwnjvBO2nbghgiNPwNfGeM4mBreqNwoCpBzhUQWS80u1OkmwvnwIBxn03erlCVRy3ZO02yWfiFL8a00YOPBGeoz'
// var Secret_Key = 'sk_test_51IcQRZSAJlPHwnjvS0ETYgfbaHbzMPGFR2kNA3xEgf5FLaNdZLNSAOHUT2gFgQ8Iu4G5CYjWMCp5POQZjKD87skL005ujUGAi4'

// const stripe = require('stripe')(Secret_Key)
// app.get('/add_balance', function (req, res) {
//    res.render('payment', {
//       key: Publishable_Key
//    })
// })

// app.post("/api/create-checkout-session", isLoggedIn, async (req, res) => {
//    const id = req.user._id;
//    const userr = await Patient.findById(id);
//    const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       line_items: [
//          {
//             price_data: {
//                currency: "inr",
//                product_data: {
//                   name: userr.first_name,
//                },
//                unit_amount: 300 * 100,
//             },
//             quantity: 1,
//          },
//       ],
//       mode: "payment",
//       success_url: "http://localhost:3000",
//       cancel_url: "http://localhost:3000",
//    });
//    res.render('home');
// });

app.get('/terms', (req, res) => {
   res.render('tnc.ejs')
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
   const tempdoctor = await Doctor.findById(doctorid);
   console.log(document);
   console.log(tempdoctor);
   const filter = { _id: doctorid };
   const update = { $set: { wallet: tempdoctor.wallet + document.fees } };
   const result = await Doctor.updateOne(filter, update);
   const oldrating = tempdoctor.ratings;
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
      let blockchain_consent
      if (req.body.blockchain_consent == 'on') {
         blockchain_consent = true
      } else {
         blockchain_consent = false
      }
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
            blockchainConsent: blockchain_consent,
            wallet: 5000,
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
               // console.log('Email sent: ' + info.response);
            }
         });
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

app.post('/patientlogin', isPatientVerified, async (req, res, next) => {
   passport.authenticate('local.patient', {
      failureRedirect: '/patientlogin',
      successRedirect: '/',
      failureFlash: true,
      successFlash: 'Welcome to HealthPlus ' + req.body.username + '!',
   })(req, res, next)
   // let newNotification = {
   //    username: req.body.username,
   //    message: 'Logged in successfully',
   //    icon: 'bell',
   // }

   // let notification = await Notification.create(newNotification)
   // let loggedinuser = await Patient.findByUsername(req.body.username)
   // // console.log(loggedinuser);
   // loggedinuser.notifications.push(notification)
   // await loggedinuser.save()
})

app.post('/doctorlogin', isDoctorVerified, async (req, res, next) => {
   passport.authenticate('local.doctor', {
      failureRedirect: '/doctorlogin',
      successRedirect: '/',
      failureFlash: true,
      successFlash: 'Welcome to HealthPlus ' + req.body.username + '!',
   })(req, res, next)
   // let newNotification = {
   //    username: req.body.username,
   //    message: 'Logged in successfully',
   //    icon: 'bell',
   // }

   // let notification = await Notification.create(newNotification)
   // let loggedinuser = await Doctor.findByUsername(req.body.username)
   // console.log(loggedinuser);
   // loggedinuser.notifications.push(notification)
   // await loggedinuser.save()
   // console.log(loggedinuser.notifications);
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

// delete notification if it has been read(clicked)
app.get('/notification/:notificationId', isLoggedIn, async (req, res) => {
   try {
      if (req.user instanceof Doctor) {
         const user = await Doctor.findById(req.user._id)
         let noti = await Notification.findByIdAndDelete(req.params.notificationId)
         let i = 0
         while (i < user.notifications.length) {
            if (user.notifications[i].equals(req.params.notificationId)) {
               break
            }
            i++
         }
         if (i > -1) {
            user.notifications.splice(i, 1)
         }
         user.save()
         return res.redirect('/');
      }
      else {
         const user = await Patient.findById(req.user._id)
         let noti = await Notification.findByIdAndDelete(req.params.notificationId)
         let i = 0
         while (i < user.notifications.length) {
            if (user.notifications[i].equals(req.params.notificationId)) {
               break
            }
            i++
         }
         if (i > -1) {
            user.notifications.splice(i, 1)
         }
         user.save()
         return res.redirect('/');
      }

   } catch (error) {
      console.log(error.message)
   }
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

      bookedCounter = 0 //counter for disabled slots

      //disable slots before current time
      var today = moment().format('DD-MM-YYYY');
      if (pickedDate == today) {
         // get current hours
         let date_time = new Date();
         let currentHour = date_time.getHours();
         slots.forEach(slot => {
            slotEndTime = slot.slotTime.slice(-5, -3)
            if (slotEndTime <= currentHour) {
               slot['booked'] = true
               bookedCounter += 1
            }
         })
      }

      // disable slots which are booked already 
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
      console.log(patientid);
      // const slot = await AppointmentSlot.findOne({ slotId: req.body.selectedSlot })
      // const dateOfAppointment = moment(req.params.pickedDate, 'DD-MM-YYYY').toDate();


      const doctor = await Doctor.findById(doctorid)
      const fees = doctor.consultationFee;

      const patient = await Patient.findById(patientid)
      let balance = patient.wallet;

      if (balance >= fees) {
         const filter = { _id: patientid };
         const update = { $set: { wallet: balance - fees } };

         const result = await Patient.updateOne(filter, update);
         console.log(result)
         const appointment = new Appointment({
            patientid, doctorid, patientName, email, phoneno, mode, message, slotId: parseInt(selectedSlot), dateOfAppointment: req.params.pickedDate, fees
         })
         const ap = await appointment.save()
         patient.scheduledAppointments.push(ap)
         doctor.scheduledAppointments.push(ap)
         await patient.save()
         await doctor.save()

         let newNotification = {
            username: doctor.username,
            message: `You have a new appointment with Patient ${patientName} `,
            icon: 'bell',
         }

         let notification = await Notification.create(newNotification)
         doctor.notifications.push(notification)
         await doctor.save()

         req.flash('success', 'Appointment booked successfully.')
         res.redirect('/')
      }
      else {
         req.flash('danger', 'Not enough balance.')
         res.redirect('/')
      }

   } catch (error) {
      console.log(error)
      req.flash('danger', 'Something went wrong')
      res.redirect('back')
   }


})

app.get(
   '/joinAppointment/:appointmentid',
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

         if (foundAppointment.mode == 'chat') {
            return res.redirect(`/chat_appointment/${appointmentid}`)
         } else {
            return res.redirect(`/videocall/${appointmentid}`)
         }
      }
      catch (error) {
         console.log(error)
         res.redirect('back')
      }

   })


// ==================CHAT SESSION=========================
app.get(
   '/chat_appointment/:appointmentid',
   async (req, res) => {

      try {
         const appointmentid = req.params.appointmentid
         const foundAppointment = await Appointment.findById(appointmentid)
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

// ==========================VIDEO CALL SESSION====================================

app.get("/videocall/:appointmentid", async (req, res) => {
   try {
      const appointmentid = req.params.appointmentid
      const foundAppointment = await Appointment.findById(appointmentid)
      var usertype
      if (req.user instanceof Doctor) {  // if specilaity field exists,user is a doctor else a patient
         usertype = 'doctor'
      }
      else {
         usertype = 'patient'
      }

      const fullname = `${req.user.first_name} ${req.user.last_name}`
      const patientid = foundAppointment.patientid

      res.render("video_call.ejs", {
         roomId: appointmentid,
         username: fullname,
         usertype: usertype,
         patientid: patientid,
         appointmentid: appointmentid
      });
   } catch (error) {
      console.log(error)
      req.flash('danger', 'Something went wrong')
      res.redirect('back')
   }

});

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

// =====================BLOCKCHAIN ROUTES===========================
// fetch records of a patient from blockchain
app.get('/blockchain/:patientid', isLoggedIn, async (req, res) => {
   try {
      const patientId = req.params.patientid
      const foundPatient = await Patient.findById(patientId).populate('scheduledAppointments')

      if (!foundPatient) {
         req.flash('error', 'No patient found!')
         return res.redirect('/')
      }

      if (!foundPatient.blockchainConsent) {
         return res.render('patient_medical_history.ejs', { patient: foundPatient, records: false })
      }

      //patient's records only accessible by doctor having appointment with patient
      // or by the patient itself
      let flag = 0
      for (let idx = 0; idx < foundPatient.scheduledAppointments.length; idx++) {
         const appointment = foundPatient.scheduledAppointments[idx];
         if (req.user._id.equals(appointment.doctorid)) {
            flag = 1
            break
         }
      }
      // console.log(flag)
      // console.log(patientId)
      // console.log(req.user._id)
      if (flag == 0 && !(req.user._id.equals(patientId))) {
         req.flash('error', 'Not authorized!')
         return res.redirect('back')
      }
      axios
         .get(`http://localhost:5000/blockchain/getPatientRecords/${patientId}`)
         .then(function (response) {
            return response.data.records

         })
         .then((records) => {

            // remove empty record arrays from response
            // formattedRecords = []
            // records.forEach(record => {
            //    if (record.length > 0) {
            //       record.forEach(rec => {
            //          formattedRecords.push(rec)
            //       })
            //    }
            // })
            // console.log('formattedRecords')
            return res.render('patient_medical_history.ejs', { patient: foundPatient, records: records })
         })
         .catch((err) => {
            res.send(err)
         })
   } catch (error) {
      console.log(error)
   }
})

// add record to blockchain from patient side
app.post('/blockchain', isLoggedIn, upload3.array('reportFiles', 5), async (req, res) => {
   try {
      const patientId = req.user._id
      const foundPatient = await Patient.findById(patientId)

      if (!foundPatient) {
         req.flash('error', 'No patient found!')
         return res.redirect('/')
      }

      if (!foundPatient.blockchainConsent) {
         req.flash('error', 'NO patient consent to upload record to blockchain!')
         return res.redirect('/')
      }

      const diag = []
      const meds = []
      const reports = []

      for (let index = 0; index < req.body.diagnosis.length; index++) {
         diag.push({ "name": req.body.diagnosis[index], "comment": req.body.diagnosis_comment[index] })
      }

      for (let index = 0; index < req.body.medicineName.length; index++) {
         meds.push({ "name": req.body.medicineName[index], "dosage": req.body.dosage[index] })
      }

      for (let index = 0; index < req.body.reportNames.length; index++) {
         reports.push({ "reportName": req.body.reportNames[index], "filename": req.files[index].filename })
      }

      const record = {
         doctor: false, //record added by patient itself
         patient: patientId.toString(),
         data: {
            date: req.body.date,
            diagnosis: diag,
            medicines: meds,
            suggestions: req.body.info,
            reports: reports, //here reports can be either a report or a prescription 
            prescription: ""
         }
      }
      // console.log('record', record)
      axios
         .post(`http://localhost:5000/blockchain/insertTransaction`, record)
         .then((response) => {
            console.log(response.data);
            req.flash('success', 'Medical record added successfully to blockchain.')
            res.redirect('back')
         })
         .catch((error) => {
            console.log(error);
         });

   } catch (error) {
      console.log(error)
   }
})


app.get('/verify_prescription', (req, res) => {
   res.render('verify_prescription.ejs')
})

app.post('/verify_prescription/', async (req, res) => {
   const prescID = req.body.prescID
   let matchedFile = false;

   dir = __dirname + '/public/images/prescriptions/'
   const files = await readdir(dir);

   for (const file of files) {
      // Method 3:
      if (file.includes(prescID)) {
         matchedFile = file;
      }
   }
   // console.log('matchedFile')
   // console.log(matchedFile)
   res.download(
      __dirname + '/public/images/prescriptions/' + matchedFile
   )

})

app.get('/add_record', (req, res) => {
   res.render('patient/addRecord.ejs')
})

app.post('/getDoctorBySpecialization', async (req, res) => {

   const spec = req.body.spec

   const specDoctors = await Doctor.find({ speciality: spec })
   // console.log(specDoctors)

   res.send({ status: 'success', doctors: specDoctors })
})

app.get('/getNearbyDoctors/:location', async (req, res) => {

   const location = req.params.location

   axios
      .get(`http://getnearbycities.geobytes.com/GetNearbyCities?radius=100&locationcode=${location}`)
      .then(async function (response) {
         // console.log(response.data)
         var foundDoctors = []

         for (let idx = 0; idx < response.data.length; idx++) {
            const element = response.data[idx];
            // console.log('element[1]')
            // console.log(element[1])
            const doctors = await Doctor.find({ clinicLocation: element[1] })
            if (doctors.length == 0) continue
            foundDoctors.push({ loc: element[1], doctors: doctors })
         }
         // console.log('foundDoctors')
         // console.log(foundDoctors)

         if (foundDoctors.length > 0) {
            res.send({ status: 'success', doctors: foundDoctors })
         } else {
            res.send({ status: 'nodoctors' })
         }

      })
      .catch((err) => {
         res.send(err)
      })
})

app.get('/:filename', (req, res) => {
   res.download(
      __dirname + '/public/images/prescriptions/' + req.params.filename,
   )
})


const PORT = 3000
app.listen(PORT, () => console.log(`SERVER STARTED AT ${PORT}!`))
