const mongoose = require("mongoose");

const progressEntrySchema = new mongoose.Schema(
  {
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
    _id: false
  }
);

const appProgressSchema = new mongoose.Schema(
  {
    entries: {
      type: Map,
      of: progressEntrySchema,
      default: () => new Map()
    }
  },
  {
    _id: false
  }
);

const userProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    apps: {
      type: Map,
      of: appProgressSchema,
      default: () => new Map()
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "UserProgress",
  userProgressSchema
);