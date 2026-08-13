const express = require("express");
const router = express.Router();

const {
  addPet,
  getPets,
  getMyPets,
  getPetById,
  updatePet,
  deletePet,
} = require("../controllers/petController");

const upload = require("../middleware/upload");
const { protect } = require("../middleware/auth");

// Add pet
router.post(
  "/",
  protect,
  upload.single("image"),
  upload.uploadToCloudinary,
  addPet
);

// Get all pets
router.get("/", getPets);

// Get logged-in user's pets
router.get("/mine", protect, getMyPets);

// Get single pet
router.get("/:id", getPetById);

// Update pet
router.put(
  "/:id",
  protect,
  upload.single("image"),
  upload.uploadToCloudinary,
  updatePet
);

// Delete pet
router.delete("/:id", protect, deletePet);

module.exports = router;