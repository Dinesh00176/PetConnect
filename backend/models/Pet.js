const mongoose = require("mongoose");

const petSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    species: {
      type: String,
      required: true,
      enum: ["Dog", "Cat", "Other"],
    },

    breed: {
      type: String,
      required: true,
      trim: true,
    },

    ageValue: {
      type: Number,
      required: true,
      min: 0,
    },

    ageUnit: {
      type: String,
      enum: ["Weeks", "Months", "Years"],
      default: "Months",
    },

    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female"],
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    image: {
      type: String, // relative URL, e.g. /uploads/167xxxx.jpg
      default: "",
    },

    status: {
      type: String,
      enum: ["Available", "Pending", "Adopted"],
      default: "Available",
    },

    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Pet", petSchema);
