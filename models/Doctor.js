const mongoose = require('mongoose')

const DoctorSchema = new mongoose.Schema({
   isAdmin: {
      type: Boolean,
      default: false,
   },
   isVerified: {
      type: Boolean,
      default: false,
   },
   username: {
      type: String,
      required: true,
   },
   first_name: {
      type: String,
      required: true,
   },
   last_name: {
      type: String,
      required: true,
   },
   email: {
      type: String,
      required: true,
      unique: true,
   },
   phone: {
      type: String,
      required: true,
      unique: true,
   },
   gender: String,
   clinicLocation: String,
   certificate: String,
   description: {
      type: String,
      required: true,
   },
   specialty: {
      type: String,
      required: true,
   },
   consultationFee: {
      type: Number,
      required: true,
   },
   yearsOfExperience: {
      type: Number,
      required: true,
   },
   ratings: {
      type: Number,
      default: 0,
   },
   availableAppointmentSlots: [
      // slots which the doctor declares as available during his registeration
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'AppointmentSlots',
      },
   ],
   scheduledAppointments: [
      // appointments booked by patient

      {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Appointment',
      },
   ],
   reviews: [
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Review',
      },
   ],

   usernameToken: String,
})

module.exports = mongoose.model('Doctor', DoctorSchema)
