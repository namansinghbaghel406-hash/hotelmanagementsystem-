const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const dir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(dir, { recursive: true });

const allowed = [".jpg", ".jpeg", ".png", ".webp"];

module.exports = multer({
  storage: multer.diskStorage({
    destination: dir,
    filename: (req, file, cb) =>
      cb(null, crypto.randomBytes(12).toString("hex") + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    const ok = allowed.includes(path.extname(file.originalname).toLowerCase()) && file.mimetype.startsWith("image/");
    if (ok) return cb(null, true);
    const err = new Error("Only jpg, png or webp images up to 3MB are allowed");
    err.status = 400;
    cb(err);
  },
});
