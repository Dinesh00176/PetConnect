const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const petRoutes = require("./routes/petRoutes");
const adoptionRoutes = require("./routes/adoptionRoutes");

// ======================================================
// Load Environment Variables
// ======================================================

dotenv.config();

console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

// ======================================================
// Connect to MongoDB Atlas
// ======================================================

connectDB();

// ======================================================
// Create Express App
// ======================================================

const app = express();

// ======================================================
// CORS Configuration
// ======================================================

const devOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an origin
      // Example: Postman, curl
      if (!origin) {
        return callback(null, true);
      }

      // Allow deployed frontend
      if (origin === process.env.CLIENT_URL) {
        return callback(null, true);
      }

      // Allow localhost during development
      if (devOriginPattern.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,
  })
);

// ======================================================
// Body Parsers
// ======================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================================
// Cookie Parser
// ======================================================

app.use(cookieParser());

// ======================================================
// Security Headers
// ======================================================

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// ======================================================
// MongoDB Security
// ======================================================

app.use(mongoSanitize());

// ======================================================
// Rate Limiting
// ======================================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 20,

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many attempts. Please try again in a few minutes.",
  },
});

// Apply rate limiting to authentication routes

app.use("/api/auth/login", authLimiter);

app.use("/api/auth/register", authLimiter);

// ======================================================
// Static Files
// ======================================================

// This works for local development.
// For production, permanent images should preferably
// be stored in Cloudinary, AWS S3, etc.

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// ======================================================
// Health Check
// ======================================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PetConnect API is running 🐾",
    environment: process.env.NODE_ENV || "development",
  });
});

// ======================================================
// API Routes
// ======================================================

app.use("/api/auth", authRoutes);

app.use("/api/pets", petRoutes);

app.use("/api/adoptions", adoptionRoutes);

// ======================================================
// 404 Handler
// ======================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// ======================================================
// Error Handler
// ======================================================

app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🚀 Server running in ${
      process.env.NODE_ENV || "development"
    } mode on port ${PORT}`
  );
});

// ======================================================
// Export App
// ======================================================

module.exports = app;