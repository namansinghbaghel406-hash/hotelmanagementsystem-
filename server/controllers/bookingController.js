const crypto = require("crypto");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const Payment = require("../models/Payment");
const Review = require("../models/Review");
const SeasonalPrice = require("../models/SeasonalPrice");
const Setting = require("../models/Setting");
const CheckInOut = require("../models/CheckInOut");
const HousekeepingTask = require("../models/HousekeepingTask");
const Hotel = require("../models/Hotel");
const { asyncHandler, HttpError, escapeRegex } = require("../utils/errors");
const { paginate, pageResult } = require("../utils/paginate");
const { parseDay, todayUTC, DAY } = require("../utils/dates");
const { quote } = require("../utils/pricing");
const { logAction } = require("../utils/log");
const { notify, notifyRoles } = require("../utils/notify");
const { sendMail } = require("../utils/mailer");

const ACTIVE = Booking.ACTIVE_STATUSES;
const isStaff = (u) => u.userType === "Staff" || u.userType === "Admin";
const money = (n) => `Rs. ${Number(n).toLocaleString("en-IN")}`;

// ---- helpers
function readRange(fromStr, toStr, { allowPast = false } = {}) {
  const from = parseDay(fromStr);
  const to = parseDay(toStr);
  if (!from || !to) throw new HttpError(400, "Dates must be in YYYY-MM-DD format");
  if (to <= from) throw new HttpError(400, "Check-out must be after check-in");
  // One day of tolerance so users ahead of UTC (e.g. India) can book "today".
  if (!allowPast && from.getTime() < todayUTC().getTime() - DAY) throw new HttpError(400, "Check-in cannot be in the past");
  return { from, to };
}

const roomIsFree = async (roomId, from, to, excludeId) =>
  !(await Booking.exists({
    room: roomId,
    status: { $in: ACTIVE },
    fromDate: { $lt: to },
    toDate: { $gt: from },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }));

async function priceStay(room, from, to) {
  const [rules, settings] = await Promise.all([SeasonalPrice.find({ active: true }).sort({ createdAt: -1 }), Setting.get()]);
  return quote({ baseRate: room.rentPerDay, roomType: room.type, from, to, rules, taxRate: settings.taxRate });
}

function validateCard({ cardHolderName, cardNumber, expMonthYear, cvv }) {
  if (!cardHolderName || !cardNumber || !expMonthYear || !cvv) throw new HttpError(400, "All payment fields are required");
  const digits = String(cardNumber).replace(/\s+/g, "");
  if (!/^\d{12,19}$/.test(digits)) throw new HttpError(400, "Invalid card number");
  if (!/^\d{3,4}$/.test(String(cvv))) throw new HttpError(400, "Invalid CVV");
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(String(expMonthYear));
  if (!m) throw new HttpError(400, "Expiry must be MM/YY");
  const now = new Date();
  const expYear = 2000 + Number(m[2]);
  const expMonth = Number(m[1]);
  if (expYear < now.getUTCFullYear() || (expYear === now.getUTCFullYear() && expMonth < now.getUTCMonth() + 1)) {
    throw new HttpError(400, "This card has expired");
  }
  return digits;
}

const loadBooking = async (id, user) => {
  const booking = await Booking.findById(id).populate("room").populate("user", "name email phone").populate("payment");
  if (!booking) throw new HttpError(404, "Booking not found");
  if (!isStaff(user) && String(booking.user._id) !== String(user._id)) throw new HttpError(403, "This is not your booking");
  return booking;
};

const bookingMail = (booking, subject, line) =>
  sendMail({
    to: booking.user.email,
    subject,
    text: `Hi ${booking.guestName},\n\n${line}\n\nBooking ID: ${booking._id}\nRoom: ${booking.room.roomNumber} (${booking.roomType})\nDates: ${booking.fromDate.toISOString().slice(0, 10)} to ${booking.toDate.toISOString().slice(0, 10)}\nTotal: ${money(booking.totalAmount)}\n\nThank you for choosing HotelPro.`,
  });

// ---- guest endpoints
exports.quoteBooking = asyncHandler(async (req, res) => {
  const { roomId, fromDate, toDate } = req.body;
  const { from, to } = readRange(fromDate, toDate);
  const room = await Room.findById(roomId);
  if (!room) throw new HttpError(404, "Room not found");
  const available = room.status !== "maintenance" && (await roomIsFree(room._id, from, to));
  res.json({ ...(await priceStay(room, from, to)), available });
});

exports.createBooking = asyncHandler(async (req, res) => {
  const { roomId, fromDate, toDate } = req.body;
  const { from, to } = readRange(fromDate, toDate);
  const digits = validateCard(req.body);

  const room = await Room.findById(roomId);
  if (!room) throw new HttpError(404, "Room not found");
  if (room.status === "maintenance") throw new HttpError(409, "This room is under maintenance");
  if (!(await roomIsFree(room._id, from, to))) throw new HttpError(409, "Room is not available for the selected dates");

  const [price, settings] = await Promise.all([priceStay(room, from, to), Setting.get()]);

  const booking = await Booking.create({
    room: room._id,
    user: req.user._id,
    roomType: room.type,
    guestName: req.user.name,
    phone: req.user.phone,
    fromDate: from,
    toDate: to,
    totalDays: price.totalDays,
    nights: price.nights,
    subtotal: price.subtotal,
    taxRate: price.taxRate,
    tax: price.tax,
    totalAmount: price.totalAmount,
    status: settings.requireApproval ? "pending" : "booked",
  });

  // Two requests can pass the check above at the same time. The booking with the lower _id wins,
  // so the other one rolls itself back.
  const clash = await Booking.exists({
    _id: { $lt: booking._id },
    room: room._id,
    status: { $in: ACTIVE },
    fromDate: { $lt: to },
    toDate: { $gt: from },
  });
  if (clash) {
    await booking.deleteOne();
    throw new HttpError(409, "Room was just booked by someone else for these dates");
  }

  // Simulated gateway: swap this block for Stripe / Razorpay in production.
  const payment = await Payment.create({
    booking: booking._id,
    user: req.user._id,
    amount: booking.totalAmount,
    cardHolderName: req.body.cardHolderName,
    cardLast4: digits.slice(-4),
    transactionId: `TXN${Date.now()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
    status: "paid",
  });
  booking.payment = payment._id;
  await booking.save();

  const full = await Booking.findById(booking._id).populate("room").populate("user", "name email phone");
  notify(req.user._id, "Booking received", `Room ${room.roomNumber}, ${price.totalDays} night(s), ${money(booking.totalAmount)}`, "booking", "/user/bookings");
  notifyRoles(["Staff", "Admin"], "New booking", `${req.user.name} booked room ${room.roomNumber}`, "booking", "/staff");
  bookingMail(full, "Your HotelPro booking", settings.requireApproval ? "Your booking is awaiting approval." : "Your booking is confirmed.");
  logAction(req, "booking_created", "Booking", booking._id, `Room ${room.roomNumber} ${money(booking.totalAmount)}`);

  res.status(201).json({ msg: settings.requireApproval ? "Booking placed, awaiting approval" : "Room booked successfully", booking: full, payment });
});

exports.myBookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10 });
  const filter = { user: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Booking.find(filter).populate("room", "roomNumber type photos").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Booking.countDocuments(filter),
  ]);
  const reviewed = new Set((await Review.find({ booking: { $in: items.map((b) => b._id) } }).select("booking")).map((r) => String(r.booking)));
  res.json(pageResult(items.map((b) => ({ ...b, reviewed: reviewed.has(String(b._id)) })), total, page, limit));
});

exports.getBooking = asyncHandler(async (req, res) => res.json(await loadBooking(req.params.id, req.user)));

exports.cancelBooking = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req.params.id, req.user);
  if (!["pending", "booked"].includes(booking.status)) {
    throw new HttpError(400, booking.status === "cancelled" ? "Booking already cancelled" : "Only upcoming bookings can be cancelled");
  }

  booking.status = "cancelled";
  const paid = booking.payment && booking.payment.status === "paid";
  if (paid) {
    booking.refund = {
      status: "requested",
      amount: booking.totalAmount,
      reason: String(req.body.reason || "").slice(0, 300),
      requestedAt: new Date(),
    };
  }
  await booking.save();

  notify(booking.user._id, "Booking cancelled", paid ? "Your refund request has been sent to our team." : "Your booking was cancelled.", "booking", "/user/bookings");
  notifyRoles(["Staff", "Admin"], "Booking cancelled", `Room ${booking.room.roomNumber}${paid ? " - refund requested" : ""}`, "booking", "/staff");
  bookingMail(booking, "Booking cancelled", paid ? "Your booking was cancelled and a refund has been requested." : "Your booking was cancelled.");
  logAction(req, "booking_cancelled", "Booking", booking._id, paid ? "refund requested" : "");
  res.json({ msg: paid ? "Booking cancelled. Refund requested." : "Booking cancelled", booking });
});

exports.getInvoice = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req.params.id, req.user);
  if (booking.status === "pending") throw new HttpError(400, "An invoice is available once the booking is approved");
  const [settings, hotel] = await Promise.all([Setting.get(), booking.room.hotel ? Hotel.findById(booking.room.hotel) : null]);
  const y = booking.createdAt.getUTCFullYear();
  res.json({
    invoiceNumber: `INV-${y}-${String(booking._id).slice(-6).toUpperCase()}`,
    issuedAt: booking.createdAt,
    siteName: settings.siteName,
    currency: settings.currency,
    hotel: hotel ? { name: hotel.name, address: hotel.address, city: hotel.city, phone: hotel.phone } : null,
    guest: { name: booking.guestName, email: booking.user.email, phone: booking.phone },
    room: { number: booking.room.roomNumber, type: booking.roomType },
    fromDate: booking.fromDate,
    toDate: booking.toDate,
    nights: booking.nights,
    totalDays: booking.totalDays,
    subtotal: booking.subtotal,
    taxRate: booking.taxRate,
    tax: booking.tax,
    totalAmount: booking.totalAmount,
    bookingStatus: booking.status,
    refund: booking.refund,
    payment: booking.payment
      ? { status: booking.payment.status, last4: booking.payment.cardLast4, transactionId: booking.payment.transactionId, refundedAmount: booking.payment.refundedAmount }
      : null,
  });
});

// ---- staff / admin endpoints
exports.allBookings = asyncHandler(async (req, res) => {
  const { status, refund, q, from, to } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10 });
  const filter = {};
  if (status) filter.status = status;
  if (refund) filter["refund.status"] = refund;
  if (q) filter.guestName = new RegExp(escapeRegex(q), "i");
  if (from) {
    const d = parseDay(from);
    if (!d) throw new HttpError(400, "Invalid from date");
    filter.toDate = { $gt: d };
  }
  if (to) {
    const d = parseDay(to);
    if (!d) throw new HttpError(400, "Invalid to date");
    filter.fromDate = { $lt: new Date(d.getTime() + DAY) };
  }
  const [items, total] = await Promise.all([
    Booking.find(filter).populate("room", "roomNumber type").populate("user", "name email").populate("payment", "status cardLast4 transactionId")
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    Booking.countDocuments(filter),
  ]);
  res.json(pageResult(items, total, page, limit));
});

exports.approveBooking = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req.params.id, req.user);
  if (booking.status !== "pending") throw new HttpError(400, "Only pending bookings can be approved");
  booking.status = "booked";
  await booking.save();
  notify(booking.user._id, "Booking approved", `Room ${booking.room.roomNumber} is confirmed.`, "booking", "/user/bookings");
  bookingMail(booking, "Your booking is approved", "Good news, your booking has been approved.");
  logAction(req, "booking_approved", "Booking", booking._id);
  res.json({ msg: "Booking approved", booking });
});

exports.modifyBooking = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req.params.id, req.user);
  if (!["pending", "booked"].includes(booking.status)) throw new HttpError(400, "Only upcoming bookings can be modified");

  const { fromDate, toDate, notes } = req.body;
  if (notes !== undefined) booking.notes = String(notes).slice(0, 500);

  if (fromDate || toDate) {
    const { from, to } = readRange(fromDate || booking.fromDate.toISOString().slice(0, 10), toDate || booking.toDate.toISOString().slice(0, 10), { allowPast: true });
    if (!(await roomIsFree(booking.room._id, from, to, booking._id))) throw new HttpError(409, "Room is not available for the new dates");
    const price = await priceStay(booking.room, from, to);
    Object.assign(booking, {
      fromDate: from,
      toDate: to,
      totalDays: price.totalDays,
      nights: price.nights,
      subtotal: price.subtotal,
      taxRate: price.taxRate,
      tax: price.tax,
      totalAmount: price.totalAmount,
    });
    // Demo behaviour: the recorded payment follows the new total. A real gateway would charge or refund the difference.
    if (booking.payment && booking.payment.status === "paid") {
      booking.payment.amount = price.totalAmount;
      await booking.payment.save();
    }
  }
  await booking.save();
  notify(booking.user._id, "Booking updated", `Your stay for room ${booking.room.roomNumber} was updated by our team.`, "booking", "/user/bookings");
  logAction(req, "booking_modified", "Booking", booking._id, `${fromDate || ""} ${toDate || ""}`.trim());
  res.json({ msg: "Booking updated", booking });
});

exports.processRefund = asyncHandler(async (req, res) => {
  const { action, note } = req.body;
  if (!["approve", "reject"].includes(action)) throw new HttpError(400, "Action must be approve or reject");
  const booking = await loadBooking(req.params.id, req.user);
  if (booking.refund.status !== "requested") throw new HttpError(400, "There is no pending refund request on this booking");

  booking.refund.status = action === "approve" ? "approved" : "rejected";
  booking.refund.processedAt = new Date();
  booking.refund.processedBy = req.user._id;
  booking.refund.note = String(note || "").slice(0, 300);
  if (action === "approve" && booking.payment) {
    booking.payment.status = "refunded";
    booking.payment.refundedAmount = booking.refund.amount;
    await booking.payment.save();
  }
  await booking.save();

  const msg = action === "approve" ? `Your refund of ${money(booking.refund.amount)} was approved.` : "Your refund request was declined.";
  notify(booking.user._id, "Refund update", msg, "payment", "/user/bookings");
  bookingMail(booking, "Refund update", msg);
  logAction(req, `refund_${action}d`, "Booking", booking._id, money(booking.refund.amount));
  res.json({ msg: `Refund ${action}d`, booking });
});

exports.checkIn = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req.params.id, req.user);
  if (booking.status !== "booked") throw new HttpError(400, "Only confirmed bookings can be checked in");
  if (booking.fromDate.getTime() > Date.now() + DAY) throw new HttpError(400, "Too early: check-in opens one day before the arrival date");
  if (booking.toDate.getTime() <= todayUTC().getTime() - DAY) throw new HttpError(400, "This booking has already ended");
  if (booking.room.status !== "available") throw new HttpError(409, `Room ${booking.room.roomNumber} is not ready (status: ${booking.room.status})`);

  booking.status = "checked_in";
  booking.room.status = "occupied";
  await Promise.all([booking.save(), booking.room.save()]);
  await CheckInOut.findOneAndUpdate(
    { booking: booking._id },
    { booking: booking._id, room: booking.room._id, guest: booking.user._id, checkInAt: new Date(), checkInBy: req.user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  notify(booking.user._id, "Welcome!", `You are checked in to room ${booking.room.roomNumber}.`, "booking", "/user/bookings");
  logAction(req, "check_in", "Booking", booking._id, `Room ${booking.room.roomNumber}`);
  res.json({ msg: "Guest checked in", booking });
});

exports.checkOut = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req.params.id, req.user);
  if (booking.status !== "checked_in") throw new HttpError(400, "Only checked-in guests can be checked out");

  booking.status = "checked_out";
  booking.room.status = "cleaning";
  await Promise.all([booking.save(), booking.room.save()]);
  await CheckInOut.findOneAndUpdate({ booking: booking._id }, { checkOutAt: new Date(), checkOutBy: req.user._id });
  await HousekeepingTask.create({
    room: booking.room._id,
    priority: "normal",
    notes: `Post check-out cleaning (${booking.guestName})`,
    createdBy: req.user._id,
  });

  notify(booking.user._id, "Thanks for staying with us", "Your invoice is ready. You can also leave a review.", "booking", "/user/bookings");
  bookingMail(booking, "Thank you for your stay", "You have been checked out. Your invoice is available in My Bookings.");
  notifyRoles(["Staff", "Admin"], "Room needs cleaning", `Room ${booking.room.roomNumber} was checked out`, "service", "/staff");
  logAction(req, "check_out", "Booking", booking._id, `Room ${booking.room.roomNumber}`);
  res.json({ msg: "Guest checked out. Housekeeping task created.", booking });
});
