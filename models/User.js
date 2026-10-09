const mongoose = require("mongoose");

const appRewardSchema = new mongoose.Schema(
  {
    appName: {
      type: String,
      required: true,
      trim: true
    },

    kcEarned: {
      type: Number,
      default: 100
    },

    linkedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false
  }
);

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

    isLoggedIn:
     {
        type: Boolean,
        default: false
    },

    appRewards: {
      type: [appRewardSchema],
      default: []
    },

    kc: {
      type: Number,
      default: 0
    },

    ca: {
      type: Boolean,
      default: false
    },

    avatar: {
      type: Number,
      default: 0
    },

    selectedFrameId: {
      type: String,
      default: "frame_0"
    },

    unlockedFrameIds: {
      type: [String],
      default: ["frame_0"]
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "User",
  userSchema
);