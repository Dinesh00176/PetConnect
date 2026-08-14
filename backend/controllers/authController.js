const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");

// ======================================================
// Generate JWT
// ======================================================

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// ======================================================
// Send JWT Cookie
// ======================================================

const sendTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,

    // Required for HTTPS production deployment
    secure: process.env.NODE_ENV === "production",

    // Required for Vercel frontend → Render backend
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",

    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// ======================================================
// Register User
// @route POST /api/auth/register
// ======================================================

const registerUser = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    name = typeof name === "string" ? name.trim() : name;
    email =
      typeof email === "string"
        ? email.trim().toLowerCase()
        : email;

    // Check all fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all fields",
      });
    }

    // Validate name
    if (name.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please enter your full name",
      });
    }

    // Validate email
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Validate password
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // Generate JWT
    const token = generateToken(user._id);

    // Send JWT cookie
    sendTokenCookie(res, token);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);

    // Duplicate email
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again",
    });
  }
};

// ======================================================
// Login User
// @route POST /api/auth/login
// ======================================================

const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body;

    email =
      typeof email === "string"
        ? email.trim().toLowerCase()
        : email;

    // Check fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email and password",
      });
    }

    // Find user
    const user = await User.findOne({ email });

    // Invalid user
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT
    const token = generateToken(user._id);

    // Send cookie
    sendTokenCookie(res, token);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again",
    });
  }
};

// ======================================================
// Logout User
// @route POST /api/auth/logout
// ======================================================

const logoutUser = async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,

    secure: process.env.NODE_ENV === "production",

    sameSite:
      process.env.NODE_ENV === "production"
        ? "none"
        : "lax",

    expires: new Date(0),
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

// ======================================================
// Get Current User
// @route GET /api/auth/me
// ======================================================

const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,

    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
};

// ======================================================
// Export Controllers
// ======================================================

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
};