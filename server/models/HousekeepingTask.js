const mongoose = require("mongoose");

const housekeepingSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    status: { type: String, enum: ["pending", "in_progress", "done"], default: "pending", index: true },
    priority: { type: String, enum: ["low", "normal", "high"], default: "normal" },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("HousekeepingTask", housekeepingSchema);
