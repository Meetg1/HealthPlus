const express = require('express')
const app = express()
const path = require('path')
require('dotenv').config()
const ejsMate = require('ejs-mate')
const mongoose = require('mongoose')
const Admin = require('./models/Admin')
const Patient = require('./models/Patient')
const Doctor = require('./models/Doctor')
const bodyParser = require("body-parser")
const expressValidator = require('express-validator')
const crypto = require("crypto")
const multer = require("multer")
const session = require('express-session')
const methodOverride = require('method-override');
// const cookieParser = require('cookie-parser')
const flash = require('connect-flash')

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
connectDB();

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
   })
);


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


const storage = multer.diskStorage({
   destination: (req, file, cb) => {
      if (file.fieldname === "aadharCard") {
         cb(null, path.join(__dirname, "public/doctorCertificates/aadharCard"));
      }
      else if (file.fieldname === "panCard") {
         cb(null, path.join(__dirname, "public/doctorCertificates/panCard"));
      }
      else if (file.fieldname === "gradMarksheet") {
         cb(null, path.join(__dirname, "public/doctorCertificates/gradMarksheet"));
      }
      else if (file.fieldname === "digitalKYC") {
         cb(null, path.join(__dirname, "public/doctorCertificates/digitalKYC"));
      }
   },
   filename: (req, file, cb) => {
      if (file.fieldname === "aadharCard") {
         cb(null, file.fieldname + Date.now() + path.extname(file.originalname));
      }
      else if (file.fieldname === "panCard") {
         cb(null, file.fieldname + Date.now() + path.extname(file.originalname));
      }
      else if (file.fieldname === "gradMarksheet") {
         cb(null, file.fieldname + Date.now() + path.extname(file.originalname));
      }
      else if (file.fieldname === "digitalKYC") {
         cb(null, file.fieldname + Date.now() + path.extname(file.originalname));
      }
   }
});

const upload = multer({
   storage: storage,
   limits: {
      fileSize: 1024 * 1024 * 10
   },
   fileFilter: (req, file, cb) => {
      checkFileType(file, cb);
   }
});


function checkFileType(file, cb) {
   if (file.fieldname === "aadharCard" || file.fieldname === "panCard" || file.fieldname === "gradMarksheet" || file.fieldname === "digitalKYC") {
      if (
         file.mimetype === 'application/pdf' ||
         file.mimetype === 'application/msword' ||
         file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
         file.mimetype === 'image/png' ||
         file.mimetype === 'image/jpg' ||
         file.mimetype === 'image/jpeg'
      ) { // check file type to be pdf, doc, docx, png, jpg, jpeg
         cb(null, true);
      } else {
         cb(null, false); // else fails
      }
   }
}


var validator = function (req, res, next) {
   req.checkBody("uname", "Username is required").notEmpty().withMessage('Username field is required');
   req.checkBody("fname", "First name is required").notEmpty();
   req.checkBody("lname", "Last name is required").notEmpty();
   req.checkBody("contact", "Enter a valid Contact No.").isMobilePhone('en-IN');
   req.checkBody("email", "Enter a valid Email-id").isEmail();
   req.checkBody("pwd", "Password must be of minimum 6 characters").isLength({ min: 6 })
   req.checkBody("cpwd", "Passwords do not match").equals(req.body.pwd);
   req.checkBody("speciality", "Select a specialty").notEmpty();
   req.checkBody("exp", "Years of Experience is required").notEmpty();
   req.checkBody("fee", "Consultation Fee is required").notEmpty();
   req.checkBody("location", "Clinic Location is required").notEmpty();
   req.checkBody("desc", "Description is required").notEmpty();

   aadhar_Card = typeof req.files['aadharCard'] !== "undefined" ? req.files['aadharCard'][0].filename : '';
   req.checkBody("aadharCard", "Aadhar Card is required").isFile(aadhar_Card);

   pan_Card = typeof req.files['panCard'] !== "undefined" ? req.files['panCard'][0].filename : '';
   req.checkBody("panCard", "PAN Card is required").isFile(pan_Card);

   grad_Marksheet = typeof req.files['gradMarksheet'] !== "undefined" ? req.files['gradMarksheet'][0].filename : '';
   req.checkBody("gradMarksheet", "Graduation Marksheet is required").isFile(grad_Marksheet);

   digital_KYC = typeof req.files['digitalKYC'] !== "undefined" ? req.files['digitalKYC'][0].filename : '';
   req.checkBody("digitalKYC", "Digital KYC is required").isFile(digital_KYC);

   req.asyncValidationErrors().then(function () {
      next();
   }).catch(function (errors) {
      console.log(errors)
      res.status(500).redirect('back');
   });

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

// app.get('/admin/doctorVerification', (req, res) => {
//    res.render('doctor/doctor_verification.ejs')
// })

app.post('/doctorRegister', upload.fields(
   [
      {
         name: 'aadharCard', maxCount: 1
      },
      {
         name: 'panCard', maxCount: 1
      },
      {
         name: 'gradMarksheet', maxCount: 1
      },
      {
         name: 'digitalKYC', maxCount: 1
      }
   ]
), validator, async (req, res, next) => {

   try {

      let errors = req.validationErrors();
      if (req.file == "undefined" || errors) {
         console.log('No file selected');
         res.render('doctor/doctorRegister.ejs', {
            errors
         });
      } else {
         // console.log(req.files);
         const aadharCard = req.files.aadharCard[0].filename;
         const panCard = req.files.panCard[0].filename;
         const gradMarksheet = req.files.gradMarksheet[0].filename;
         const digitalKYC = req.files.digitalKYC[0].filename;

         const doctor = new Doctor({
            username: req.body.uname,
            usernameToken: crypto.randomBytes(64).toString("hex"),
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
            aadharCard: aadharCard,
            panCard: panCard,
            gradMarksheet: gradMarksheet,
            digitalKYC: digitalKYC,
            //availableAppointmentSlots: req.body.availableAppointmentSlots
         });

         const registeredDoctor = await doctor.save();
         console.log(registeredDoctor);

      }

   } catch (error) {
      console.log(error);
   }
   res.redirect('/doctorRegister')
});

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

app.get('/admin/doctors', async (req, res) => {
   try {
      const limitNumber = 20;
      const doctors = await Doctor.find({}).limit(limitNumber);
      res.render('doctors.ejs', { doctors })
   } catch (error) {
      res.status(500).send({ message: error.message || "Error Occured" });
   }

})

app.get('/admin/doctors/:id', async (req, res) => {
   try {
      let doctorId = req.params.id;
      const doctor = await Doctor.findById(doctorId);
      res.render('doctor/doctor_verification.ejs', { doctor })
   } catch (error) {
      res.status(500).send({ message: error.message || "Error Occured" });
   }
})

app.get('/admin/verifydoctor/:id', async (req, res) => {
   try {
      let doctorId = req.params.id;
      const doctor = await Doctor.findById(doctorId);
      doctor.isVerified = true;
      await doctor.save();
      res.render('doctor/doctor_verification.ejs', { doctor })
   } catch (error) {
      res.status(500).send({ message: error.message || "Error Occured" });
   }
})

app.get('/admin/deletedoctor/:id', async (req, res) => {
   Doctor.findByIdAndDelete(req.params.id, (err, doc) => {
      if (!err) {
         res.redirect('/admin/doctors');
      }
      else {
         console.log(err);
      }
   })
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
