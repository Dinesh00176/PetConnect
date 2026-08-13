const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;

  const isValidExt = allowed.test(
    require("path").extname(file.originalname).toLowerCase()
  );

  const isValidMime = allowed.test(file.mimetype);

  if (isValidExt && isValidMime) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only image files (jpg, jpeg, png, webp, gif) are allowed"
      )
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// Upload image buffer to Cloudinary
upload.uploadToCloudinary = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const stream = cloudinary.uploader.upload_stream(
    {
      folder: "petconnect/pets",
      resource_type: "image",
    },
    (error, result) => {
      if (error) {
        return next(error);
      }

      req.file.path = result.secure_url;
      req.file.cloudinaryPublicId = result.public_id;

      next();
    }
  );

  streamifier.createReadStream(req.file.buffer).pipe(stream);
};

module.exports = upload;