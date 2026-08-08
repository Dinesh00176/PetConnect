const mongoose = require("mongoose");

const adoptionSchema = new mongoose.Schema(
  {
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pet",
      required: true,
    },

    // snapshot of the pet's details at time of adoption — the Pet document
    // itself is deleted once adopted, so this is the only record left of it
    petName: {
      type: String,
      required: true,
    },

    petSpecies: {
      type: String,
      default: "",
    },

    petBreed: {
      type: String,
      default: "",
    },

    petImage: {
      type: String,
      default: "",
    },

    // if the adopter was logged in, link their account too
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    adopterName: {
      type: String,
      required: true,
      trim: true,
    },

    adopterEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    adopterPhone: {
      type: String,
      required: true,
      trim: true,
    },

    adopterAddress: {
      type: String,
      trim: true,
      default: "",
    },

    message: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Adoption", adoptionSchema);
