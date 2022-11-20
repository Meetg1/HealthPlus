const mongoose = require('mongoose')

const AppointmentSlotSchema = new mongoose.Schema({
   slotId: {
      type: Number,
      required: true,
   },
   slotTime: {
      type: String,
      required: true,
   },
})

module.exports = mongoose.model('AppointmentSlot', AppointmentSlotSchema)
