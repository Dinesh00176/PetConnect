# PetConnect 🐾
**Find your perfect companion. Give pets a loving home.**

A full-stack Pet Adoption Platform built with HTML, CSS, Vanilla JavaScript, Node.js, Express, and MongoDB.

## Current Status
This is **Step 1** of the build: project skeleton + Express server + MongoDB Atlas connection.

## Folder Structure
```
petconnect/
├── backend/
│   ├── config/        → db.js (MongoDB connection)
│   ├── controllers/    → (empty, added in later steps)
│   ├── models/          → (empty, added in later steps)
│   ├── routes/           → (empty, added in later steps)
│   ├── middleware/        → (empty, added in later steps)
│   ├── utils/               → (empty, added in later steps)
│   ├── uploads/               → temp storage before Cloudinary upload
│   ├── .env.example
│   ├── .gitignore
│   ├── server.js
│   └── package.json
└── frontend/
    ├── css/style.css
    ├── js/main.js
    ├── images/
    └── index.html
```

## Setup Instructions

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment variables
Rename `.env.example` to `.env` and fill in your own values:
```bash
cd backend
mv .env.example .env
```
Then open `.env` and add:
- Your MongoDB Atlas connection string (`MONGO_URI`)
- A JWT secret (`JWT_SECRET`) — any long random string
- Your Cloudinary credentials (get these free at cloudinary.com)

### 3. Run the backend server
```bash
npm run dev
```
You should see:
```
✅ MongoDB Connected: xxxxx.mongodb.net
🚀 Server running in development mode on port 5000
```

### 4. Test the API
Open in your browser: `http://localhost:5000/api/health`

You should see:
```json
{ "success": true, "message": "PetConnect API is running 🐾" }
```

### 5. View the frontend
Open `frontend/index.html` in your browser, or use VS Code's "Live Server" extension for auto-reload.

## What's Next
- Step 2: User model + Register/Login with JWT + bcrypt
- Step 3: Pet model + CRUD APIs
- Step 4: Frontend pages (Home, Browse, Pet Details)
- ...and onward through the full feature list

## Tech Stack
**Frontend:** HTML5, CSS3, Vanilla JS (ES6+), Font Awesome, Google Fonts
**Backend:** Node.js, Express.js, MongoDB Atlas, Mongoose, JWT, bcrypt.js, Multer, Cloudinary
