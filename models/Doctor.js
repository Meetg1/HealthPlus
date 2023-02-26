const mongoose = require('mongoose')

const passportLocalMongoose = require("passport-local-mongoose");

const DoctorSchema = new mongoose.Schema({
   isVerified: {
      type: Boolean,
      default: false,
   },
   first_name: {
      type: String,
      // required: true,
   },
   last_name: {
      type: String,
      // required: true,
   },
   phone: {
      type: String,
      // required: true,
      unique: true,
   },
   gender: String,
   clinicLocation: String,
   preferredLanguage: {
      type: Number,
      required: true,
      default: -1
   },
   aadharCard: {
      type: String,
      // required: true,
   },
   panCard: {
      type: String,
      // required: true,
   },
   degreeCertificates: {
      type: String,
      // required: true,
   },
   digitalKYC: {
      type: String,
      // required: true,
   },
   description: {
      type: String,
      // required: true,
   },
   specialty: {
      type: String,
      // required: true,
   },
   consultationFee: {
      type: Number,
      // required: true,
   },
   yearsOfExperience: {
      type: Number,
      // required: true,
   },
   ratings: {
      type: Number,
      default: 0,
   },
   mondayAvailableAppointmentSlots: [
      // slots which the doctor declares as available during his registration
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'AppointmentSlot',
      },
   ],
   tuesdayAvailableAppointmentSlots: [
      // slots which the doctor declares as available during his registration
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'AppointmentSlot',
      },
   ],
   wednesdayAvailableAppointmentSlots: [
      // slots which the doctor declares as available during his registration
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'AppointmentSlot',
      },
   ],
   thursdayAvailableAppointmentSlots: [
      // slots which the doctor declares as available during his registration
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'AppointmentSlot',
      },
   ],
   fridayAvailableAppointmentSlots: [
      // slots which the doctor declares as available during his registration
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'AppointmentSlot',
      },
   ],
   saturdayAvailableAppointmentSlots: [
      // slots which the doctor declares as available during his registration
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'AppointmentSlot',
      },
   ],
   sundayAvailableAppointmentSlots: [
      // slots which the doctor declares as available during his registration
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'AppointmentSlot',
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

DoctorSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('Doctor', DoctorSchema)
