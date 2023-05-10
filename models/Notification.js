const mongoose = require('mongoose')

const NotificationSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    message: {
        type: String,
    },
    icon: {
        type: String,
        default: "bell"
    }
});

module.exports = mongoose.model("Notification", NotificationSchema);