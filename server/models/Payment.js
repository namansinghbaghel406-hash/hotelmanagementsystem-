const mongoose = require("mongoose");

// Card number and CVV are never stored: only the last 4 digits and the holder name.
// This is a simulated gateway. For real payments swap the call in bookingController for Stripe/Razorpay.
const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true },
    method: { type: String, default: "card" },
    cardHolderName: { type: String, default: "" },
    cardLast4: { type: String, default: "" },
    transactionId: { type: String, required: true, unique: true },
    status: { type: String, enum: ["paid", "refunded", "failed"], default: "paid", index: true },
    refundedAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
