const mongoose = require("mongoose");

// Audit trail + security events + server errors.
const logSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: String,
    role: String,
    action: { type: String, required: true, index: true },
    entity: { type: String, default: "" },
    entityId: { type: String, default: "" },
    details: { type: String, default: "" },
    level: { type: String, enum: ["info", "warn", "error"], default: "info", index: true },
    ip: String,
  },
  { timestamps: true }
);

logSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AdminLog", logSchema);
