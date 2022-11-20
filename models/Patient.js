const mongoose = require("mongoose");

const PatientSchema = new mongoose.Schema ({
    isAdmin: {
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
    scheduledAppointments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment"
    }],
    location: String,
    usernameToken: String,

})


module.exports = mongoose.model("Patient", PatientSchema)
