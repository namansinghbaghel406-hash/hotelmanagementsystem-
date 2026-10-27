const mongoose = require("mongoose");

const ACTIVE_STATUSES = ["pending", "booked", "checked_in"];

const bookingSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    roomType: { type: String, required: true },
    guestName: { type: String, required: true },
    phone: { type: String, required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },
    // Night-by-night prices captured at booking time so invoices never change later.
    nights: [{ date: String, rate: Number, rule: String, _id: false }],
    subtotal: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    status: {
      type: String,
      enum: ["pending", "booked", "checked_in", "checked_out", "cancelled"],
      default: "booked",
      index: true,
    },
    refund: {
      status: { type: String, enum: ["none", "requested", "approved", "rejected"], default: "none" },
      amount: { type: Number, default: 0 },
      reason: { type: String, default: "" },
      requestedAt: Date,
      processedAt: Date,
      processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      note: { type: String, default: "" },
    },
    notes: { type: String, default: "" },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Availability lookups: "any active booking for this room overlapping these dates?"
bookingSchema.index({ room: 1, status: 1, fromDate: 1, toDate: 1 });
bookingSchema.index({ createdAt: -1 });

const Booking = mongoose.model("Booking", bookingSchema);
Booking.ACTIVE_STATUSES = ACTIVE_STATUSES;
module.exports = Booking;
