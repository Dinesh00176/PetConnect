const Pet = require("../models/Pet");
const Adoption = require("../models/Adoption");

const VALID_SPECIES = ["Dog", "Cat", "Other"];
const VALID_GENDER = ["Male", "Female"];
const VALID_AGE_UNIT = ["Weeks", "Months", "Years"];

const validatePetFields = (fields, options) => {
  const partial = options && options.partial;

  const name = fields.name;
  const species = fields.species;
  const breed = fields.breed;
  const ageValue = fields.ageValue;
  const gender = fields.gender;
  const location = fields.location;
  const description = fields.description;

  if (!partial) {
    if (
      !name ||
      !species ||
      !breed ||
      ageValue === undefined ||
      ageValue === "" ||
      !gender ||
      !location
    ) {
      return "Please fill all required fields";
    }
  }

  if (name !== undefined && !String(name).trim()) {
    return "Pet name cannot be empty";
  }

  if (name !== undefined && String(name).trim().length > 60) {
    return "Pet name is too long (max 60 characters)";
  }

  if (
    species !== undefined &&
    VALID_SPECIES.indexOf(species) === -1
  ) {
    return "Species must be one of: Dog, Cat, Other";
  }

  if (breed !== undefined && !String(breed).trim()) {
    return "Breed cannot be empty";
  }

  if (breed !== undefined && String(breed).trim().length > 60) {
    return "Breed is too long (max 60 characters)";
  }

  if (
    gender !== undefined &&
    VALID_GENDER.indexOf(gender) === -1
  ) {
    return "Gender must be one of: Male, Female";
  }

  if (ageValue !== undefined && ageValue !== "") {
    const numericAge = Number(ageValue);

    if (
      Number.isNaN(numericAge) ||
      numericAge < 0 ||
      numericAge > 100
    ) {
      return "Age must be a valid number between 0 and 100";
    }
  }

  if (location !== undefined && !String(location).trim()) {
    return "Location cannot be empty";
  }

  if (
    location !== undefined &&
    String(location).trim().length > 100
  ) {
    return "Location is too long (max 100 characters)";
  }

  if (
    description !== undefined &&
    String(description).length > 1000
  ) {
    return "Description is too long (max 1000 characters)";
  }

  return null;
};


// @desc Add a new pet
// @route POST /api/pets
const addPet = async (req, res) => {
  try {
    const {
      name,
      species,
      breed,
      ageValue,
      ageUnit,
      gender,
      location,
      description,
    } = req.body;

    const validationError = validatePetFields({
      name,
      species,
      breed,
      ageValue,
      gender,
      location,
      description,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    // Cloudinary returns the uploaded image URL in req.file.path
    const image = req.file ? req.file.path : "";

    const pet = await Pet.create({
      name: name.trim(),
      species,
      breed: breed.trim(),
      ageValue,
      ageUnit:
        VALID_AGE_UNIT.indexOf(ageUnit) !== -1
          ? ageUnit
          : "Months",
      gender,
      location: location.trim(),
      description: description
        ? String(description).trim()
        : "",
      image,
      addedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Pet added successfully",
      pet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// @desc Get all pets
// @route GET /api/pets
const getPets = async (req, res) => {
  try {
    const {
      species,
      gender,
      location,
      search,
      status,
      sort,
    } = req.query;

    const filter = {};

    if (!status || status === "Available") {
      filter.status = "Available";
    } else if (status !== "All") {
      filter.status = status;
    }

    if (species) filter.species = species;

    if (gender) filter.gender = gender;

    if (location) {
      filter.location = {
        $regex: location,
        $options: "i",
      };
    }

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          breed: {
            $regex: search,
            $options: "i",
          },
        },
        {
          location: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      age_asc: { ageValue: 1 },
      age_desc: { ageValue: -1 },
      name_asc: { name: 1 },
    };

    const sortOption =
      sortMap[sort] || sortMap.newest;

    const pets = await Pet.find(filter).sort(sortOption);

    res.status(200).json({
      success: true,
      count: pets.length,
      pets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// @desc Get all pets added by logged-in user
// @route GET /api/pets/mine
const getMyPets = async (req, res) => {
  try {
    const pets = await Pet.find({
      addedBy: req.user._id,
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: pets.length,
      pets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// @desc Get single pet
// @route GET /api/pets/:id
const getPetById = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found",
      });
    }

    res.status(200).json({
      success: true,
      pet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Pet not found",
    });
  }
};


// @desc Update a pet
// @route PUT /api/pets/:id
const updatePet = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found",
      });
    }

    const isOwner =
      pet.addedBy &&
      pet.addedBy.toString() ===
        req.user._id.toString();

    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only edit pets you added",
      });
    }

    const {
      name,
      species,
      breed,
      ageValue,
      ageUnit,
      gender,
      location,
      description,
      status,
    } = req.body;

    const validationError = validatePetFields(
      {
        name,
        species,
        breed,
        ageValue,
        gender,
        location,
        description,
      },
      {
        partial: true,
      }
    );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    if (name !== undefined) {
      pet.name = name.trim();
    }

    if (species !== undefined) {
      pet.species = species;
    }

    if (breed !== undefined) {
      pet.breed = breed.trim();
    }

    if (ageValue !== undefined && ageValue !== "") {
      pet.ageValue = ageValue;
    }

    if (
      ageUnit !== undefined &&
      VALID_AGE_UNIT.indexOf(ageUnit) !== -1
    ) {
      pet.ageUnit = ageUnit;
    }

    if (gender !== undefined) {
      pet.gender = gender;
    }

    if (location !== undefined) {
      pet.location = location.trim();
    }

    if (description !== undefined) {
      pet.description = String(description).trim();
    }

    if (
      status !== undefined &&
      ["Available", "Pending", "Adopted"].indexOf(status) !== -1
    ) {
      pet.status = status;
    }

    // New image uploaded to Cloudinary
    if (req.file) {
      pet.image = req.file.path;
    }

    await pet.save();

    res.status(200).json({
      success: true,
      message: `${pet.name} was updated successfully`,
      pet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// @desc Delete a pet
// @route DELETE /api/pets/:id
const deletePet = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found",
      });
    }

    const isOwner =
      pet.addedBy &&
      pet.addedBy.toString() ===
        req.user._id.toString();

    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete pets you added",
      });
    }

    await Adoption.deleteMany({
      pet: pet._id,
    });

    await pet.deleteOne();

    res.status(200).json({
      success: true,
      message: `${pet.name} has been removed`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
  addPet,
  getPets,
  getMyPets,
  getPetById,
  updatePet,
  deletePet,
};