const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },

    password: {
        type: String,
        required: true
    },

    deviceId: {
        type: String,
        required: true
    },

    appNames: {
        type: [String],
        default: []
    },

    kc: {
        type: Number,
        default: 0
    }
},
{
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);