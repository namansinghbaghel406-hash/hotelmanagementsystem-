const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: [true, "Password is required"] },
    phone: { type: String, required: [true, "Phone is required"], trim: true },
    // "Ordinary" is the guest role used in the original project description.
    userType: { type: String, enum: ["Ordinary", "Staff", "Admin"], default: "Ordinary", index: true },
    department: { type: String, trim: true, default: "" }, // for staff: Front desk, Housekeeping...
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    verifyToken: { type: String, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
