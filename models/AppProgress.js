const mongoose = require("mongoose");

const appProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    appId: {
      type: String,
      required: true,
      trim: true
    },

    key: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: ["bool", "int", "float", "string"],
      required: true
    },

    boolValue: {
      type: Boolean,
      default: false
    },

    intValue: {
      type: Number,
      default: 0
    },

    floatValue: {
      type: Number,
      default: 0
    },

    stringValue: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

appProgressSchema.index(
  {
    userId: 1,
    appId: 1,
    key: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model(
  "AppProgress",
  appProgressSchema
);