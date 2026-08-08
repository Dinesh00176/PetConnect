const express = require("express");
const router = express.Router();

const { createAdoption, getAdoptions } = require("../controllers/adoptionController");
const { optionalAuth } = require("../middleware/auth");

router.post("/", optionalAuth, createAdoption);
router.get("/", getAdoptions);

module.exports = router;
