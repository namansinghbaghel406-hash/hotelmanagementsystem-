const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: Number, required: true, unique: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "RoomCategory", index: true },
    type: { type: String, enum: ["Delux", "Non-Delux"], required: true, index: true },
    maxCount: { type: Number, required: true, min: 1 },
    rentPerDay: { type: Number, required: true, min: 0 },
    photos: { type: [String], default: [] },
    description: { type: String, required: true },
    amenities: { type: [String], default: [] },
    // Operational status, driven by check-in / check-out / housekeeping.
    status: {
      type: String,
      enum: ["available", "occupied", "cleaning", "maintenance"],
      default: "available",
      index: true,
    },
    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", roomSchema);
