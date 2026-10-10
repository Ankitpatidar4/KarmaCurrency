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

const karmaDeductionSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true
    },

    scope: {
      type: String,
      enum: ["APP", "GLOBAL"],
      required: true
    },

    appName: {
      type: String,
      default: "",
      trim: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    reason: {
      type: String,
      required: true
    },

    itemId: {
      type: String,
      required: true
    },

    createdAt: {
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

    isLoggedIn: {
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

    karmaDeductions: {
      type: [karmaDeductionSchema],
      default: []
    },
    xp: {
      type: Number,
      default: 0,
      min: 0
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      default: null
    }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

module.exports = mongoose.model("User", userSchema);