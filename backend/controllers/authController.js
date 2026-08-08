const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");

// Signs a JWT for a given user id
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// Sets the JWT as an httpOnly cookie on the response
const sendTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// @desc  Register a new user
// @route POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    let { name, email, password } = req.body;
    name = typeof name === "string" ? name.trim() : name;
    email = typeof email === "string" ? email.trim().toLowerCase() : email;

    // Check all fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all fields",
      });
    }

    if (name.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please enter your full name",
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

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

    const token = generateToken(user._id);
    sendTokenCookie(res, token);

    res.status(201).json({
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
    // Race condition: two requests registering the same email at once —
    // the unique index on email will reject the second one with code 11000
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }
    res.status(500).json({
      success: false,
      message: "Something went wrong, please try again",
    });
  }
};

// @desc  Log in an existing user
// @route POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body;
    email = typeof email === "string" ? email.trim().toLowerCase() : email;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email and password",
      });
    }

    const user = await User.findOne({ email });

    // Deliberately vague message for both "no such user" and "wrong password"
    // so a login attempt can't be used to figure out which emails are registered
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);
    sendTokenCookie(res, token);

    res.status(200).json({
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
    res.status(500).json({
      success: false,
      message: "Something went wrong, please try again",
    });
  }
};

// @desc  Log out the current user
// @route POST /api/auth/logout
const logoutUser = async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

// @desc  Get the currently logged-in user (used to restore session on page load)
// @route GET /api/auth/me
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
};
