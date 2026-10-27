const mongoose = require("mongoose");

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    description: { type: String, default: "" },
    amenities: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hotel", hotelSchema);
