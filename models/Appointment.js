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
   },
   isOver: {
      type: Boolean,
      default: false,
   }, // boolean
   dateOfAppointment: {
      type: String,
      required: true,
   },
   slotId: {
      //gives the time of appointment
      type: Number,
      // type: mongoose.Schema.Types.ObjectId,
      // ref: 'Doctor',
   },
   patientName: {
      type: String,
      required: true,
   },
   email: String,
   phoneno: String,
   message: String
})

module.exports = mongoose.model('Appointment', AppointmentSchema)
