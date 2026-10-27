const mongoose = require("mongoose");

const serviceRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    type: {
      type: String,
      enum: ["room_service", "laundry", "housekeeping", "maintenance", "other"],
      required: true,
    },
    description: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ["open", "in_progress", "resolved"], default: "open", index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    response: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceRequest", serviceRequestSchema);
