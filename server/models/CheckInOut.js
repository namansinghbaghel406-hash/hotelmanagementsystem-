const mongoose = require("mongoose");

const checkInOutSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    checkInAt: { type: Date, required: true },
    checkInBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    checkOutAt: Date,
    checkOutBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CheckInOut", checkInOutSchema);
