const mongoose = require('mongoose')
const passportLocalMongoose = require('passport-local-mongoose')

const PatientSchema = new mongoose.Schema({
   //    isAdmin: {
   //       type: Boolean,
   //       default: false,
   //    },
   first_name: {
      type: String,
      required: true,
   },
   last_name: {
      type: String,
      required: true,
   },
   phone: {
      type: String,
      required: true,
      unique: true,
   },
   gender: String,
   age: String,
   preferredLanguage: {
      type: Number,
      required: true,
      default: -1
   },
   scheduledAppointments: [
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Appointment',
      },
   ],
   location: String,
   isVerified: {
      type: Boolean,
      default: false,
   },
   blockchainConsent: {
      type: Boolean,
      default: false,
   },
   wallet: {
      type: Number,
      default: 0,

   },
   usernameToken: String,
})

PatientSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('Patient', PatientSchema)
