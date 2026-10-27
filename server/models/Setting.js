const mongoose = require("mongoose");

// Single "main" document holding platform configuration.
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    siteName: { type: String, default: "HotelPro" },
    taxRate: { type: Number, default: 12, min: 0, max: 100 },
    requireApproval: { type: Boolean, default: false },
    checkInTime: { type: String, default: "12:00" },
    checkOutTime: { type: String, default: "11:00" },
    currency: { type: String, default: "INR" },
  },
  { timestamps: true }
);

settingSchema.statics.get = function () {
  return this.findOneAndUpdate(
    { key: "main" },
    { $setOnInsert: { key: "main" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

module.exports = mongoose.model("Setting", settingSchema);
