const mongoose = require('mongoose')

const ChatSchema = new mongoose.Schema({
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
    },
    messages: [{
        username: String, // author username
        text: String,
        time: String
    }],
})

module.exports = mongoose.model('Chat', ChatSchema)
