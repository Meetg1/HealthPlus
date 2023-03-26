const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    rating: {
        type: Number,
        default: 0
    },
    recommend: {
        type: Boolean,
        default: false,
    },
    consult: {
        type: String,
    },
    feedback: {
        type: String,
    },
    doctorid: {
        type: String,
    },
    patientname: {
        type: String,
    }
})
module.exports = mongoose.model('Review', ReviewSchema);