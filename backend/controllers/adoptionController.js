const mongoose = require("mongoose");
const Adoption = require("../models/Adoption");
const Pet = require("../models/Pet");

// @desc  Submit an adoption request for a pet — saves adopter details and
//        immediately marks the pet as Adopted so it drops off the listings.
// @route POST /api/adoptions
const createAdoption = async (req, res) => {
  try {
    const { petId, adopterName, adopterEmail, adopterPhone, adopterAddress, message } = req.body;

    if (!petId || !mongoose.Types.ObjectId.isValid(petId)) {
      return res.status(400).json({
        success: false,
        message: "A valid pet is required",
      });
    }

    if (!adopterName || !adopterEmail || !adopterPhone) {
      return res.status(400).json({
        success: false,
        message: "Please fill your name, email, and phone number",
      });
    }

    const pet = await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found",
      });
    }

    if (pet.status === "Adopted") {
      return res.status(400).json({
        success: false,
        message: `${pet.name} has already been adopted`,
      });
    }

    const adoption = await Adoption.create({
      pet: pet._id,
      petName: pet.name,
      petSpecies: pet.species,
      petBreed: pet.breed,
      petImage: pet.image,
      user: req.user ? req.user._id : null,
      adopterName,
      adopterEmail,
      adopterPhone,
      adopterAddress,
      message,
    });

    // The pet has found a home — remove it from the Pet collection entirely
    // (not just hidden/flagged) so it can never resurface in listings. The
    // uploaded image file is left in place since the Adoption record above
    // still references it for the adoption history page.
    await pet.deleteOne();

    res.status(201).json({
      success: true,
      message: `Thank you! Your request to adopt ${adoption.petName} has been received.`,
      adoption,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc  List all adoption requests (record-keeping / adoption history)
// @route GET /api/adoptions
const getAdoptions = async (req, res) => {
  try {
    const adoptions = await Adoption.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: adoptions.length,
      adoptions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createAdoption,
  getAdoptions,
};
