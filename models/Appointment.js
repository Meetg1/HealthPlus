const mongoose = require('mongoose')

const AppointmentSchema = new mongoose.Schema({
   patientid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
   },
   doctorid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
   },
   mode: {
      type: String,
      enum: ['chat', 'video'],
      default: 'chat',
   }, //(chat or video)
   prescription: {
      type: String,
      required: true,
   },
   isOver: {
      type: Boolean,
      default: false,
   }, // boolean
   dateOfAppointment: {
      type: Date,
      required: true,
   },
   AppointmentSlot: {
      //gives the time of appointment
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
   },
})

module.exports = mongoose.model('Appointment', AppointmentSchema)
