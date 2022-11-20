const express = require('express')
const app = express()
const path = require('path')
require('dotenv').config()
const ejsMate = require('ejs-mate')
const mongoose = require('mongoose')
const Admin = require("./models/admin")
const Patient = require("./models/patient")
const Doctor = require("./models/doctor")

//====================DATABASE CONNECTION==========================

// const dbUrl = "mongodb://localhost:27017/edu";
const dbUrl = process.env.MY_MONGODB_URI;

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

app.get('/demo', (req, res) => {
   res.render('demo.ejs')
})

app.get('/doctor', (req, res) => {
   res.render('doctorRegister.ejs')
})

const PORT = 3000
app.listen(PORT, () => console.log(`SERVER STARTED AT ${PORT}!`))
