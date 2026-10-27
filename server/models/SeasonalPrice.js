const mongoose = require("mongoose");

// A date-range price adjustment, e.g. "Festive season: +25% from 20 Dec to 5 Jan".
// Negative percentages create discounts.
const seasonalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    adjustmentPercent: { type: Number, required: true, min: -90, max: 500 },
    roomType: { type: String, enum: ["All", "Delux", "Non-Delux"], default: "All" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SeasonalPrice", seasonalSchema);
