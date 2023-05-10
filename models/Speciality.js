const mongoose = require('mongoose')

const SpecialitySchema = new mongoose.Schema({
    specId: {
        type: Number,
        required: true,
    },
    specialType: {
        type: String,
        required: true,
    },
})

module.exports = mongoose.model('Speciality', SpecialitySchema)
