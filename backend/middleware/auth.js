const jwt = require("jsonwebtoken");
const User = require("../models/user");

// Verifies the JWT cookie and attaches the user to req.user
const protect = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, please log in",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user no longer exists",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, invalid or expired session",
    });
  }
};

// Like protect, but never blocks the request — just attaches req.user if a
// valid session cookie exists. Used for routes that work for guests too.
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (user) req.user = user;
  } catch (error) {
    // invalid/expired token — just proceed as a guest
  }
  next();
};

module.exports = { protect, optionalAuth };
