const mongoose = require("mongoose");

const appSchema = new mongoose.Schema(
  {
    appName: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    appUrl: {
      type: String,
      required: true,
      trim: true
    },

    dl: {
      type: String,
      required: true,
      trim: true
    },


    appIcon: {
      type: String,
      required: true,
      trim: true
    },

    appDetail: {
      type: String,
      required: true,
      trim: true
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("App", appSchema);