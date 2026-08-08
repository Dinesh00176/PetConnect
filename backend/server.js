const authRoutes = require("./routes/authRoutes");
const petRoutes = require("./routes/petRoutes");
const adoptionRoutes = require("./routes/adoptionRoutes");

const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Load environment variables FIRST, before anything else uses them
dotenv.config();
console.log(`Environment: ${process.env.NODE_ENV}`);
// Connect to MongoDB Atlas
connectDB();

const app = express();

// Middleware
// Live Server can run on any port depending on the machine/setup, so allow
// any localhost/127.0.0.1 dev origin in addition to CLIENT_URL, rather than
// a fixed port list that can silently break auth if the port ever changes.
const devOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (e.g. curl, Postman), the configured
    // CLIENT_URL, and any localhost/127.0.0.1 dev origin
    if (!origin || origin === process.env.CLIENT_URL || devOriginPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());              // parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // parse form data
app.use(cookieParser());              // parse cookies (for JWT)

// Security headers (sensible defaults; disable CORP since we serve images
// cross-origin to the frontend dev server)
app.use(helmet({ crossOriginResourcePolicy: false }));

// Strip out any $ / . operators from user input to prevent NoSQL injection
// (e.g. someone sending { "email": { "$gt": "" } } to bypass login)
app.use(mongoSanitize());

// Rate-limit auth endpoints to slow down brute-force login/signup attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Serve uploaded pet images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route — confirms server is alive
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PetConnect API is running 🐾'
  });
});

const PORT = process.env.PORT || 5000;
app.use("/api/auth", authRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/adoptions", adoptionRoutes);
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
