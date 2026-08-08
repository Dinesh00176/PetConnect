const express = require("express");
const router = express.Router();

const { addPet, getPets, getMyPets, getPetById, updatePet, deletePet } = require("../controllers/petController");
const upload = require("../middleware/upload");
const { protect } = require("../middleware/auth");

router.post("/", protect, upload.single("image"), addPet);
router.get("/", getPets);

// NOTE: /mine must be registered before /:id — otherwise Express would treat
// "mine" as an :id value and try (and fail) to look it up as a Mongo ObjectId.
router.get("/mine", protect, getMyPets);

router.get("/:id", getPetById);
router.put("/:id", protect, upload.single("image"), updatePet);
router.delete("/:id", protect, deletePet);

module.exports = router;
