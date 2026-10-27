const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const User = require("../models/User");
const Payment = require("../models/Payment");
const ServiceRequest = require("../models/ServiceRequest");
const SupportTicket = require("../models/SupportTicket");
const HousekeepingTask = require("../models/HousekeepingTask");
const { asyncHandler } = require("../utils/errors");
const { DAY, todayUTC, dayKey } = require("../utils/dates");

const STAYED = ["booked", "checked_in", "checked_out"];

// Dashboard numbers (Staff and Admin)
exports.summary = asyncHandler(async (req, res) => {
  const today = todayUTC();
  const tomorrow = new Date(today.getTime() + DAY);

  const [users, totalRooms, occupied, byStatus, money, arrivals, departures, openServices, openTickets, pendingRefunds, pendingApprovals, pendingHousekeeping] =
    await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      Room.countDocuments({ status: "occupied" }),
      Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Payment.aggregate([{ $group: { _id: null, collected: { $sum: "$amount" }, refunded: { $sum: "$refundedAmount" } } }]),
      Booking.countDocuments({ status: "booked", fromDate: { $gte: today, $lt: tomorrow } }),
      Booking.countDocuments({ status: "checked_in", toDate: { $gte: today, $lt: tomorrow } }),
      ServiceRequest.countDocuments({ status: { $ne: "resolved" } }),
      SupportTicket.countDocuments({ status: "open" }),
      Booking.countDocuments({ "refund.status": "requested" }),
      Booking.countDocuments({ status: "pending" }),
      HousekeepingTask.countDocuments({ status: { $ne: "done" } }),
    ]);

  const m = money[0] || { collected: 0, refunded: 0 };
  res.json({
    users,
    totalRooms,
    occupiedRooms: occupied,
    occupancyRate: totalRooms ? Math.round((occupied / totalRooms) * 100) : 0,
    bookingsByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    revenue: { collected: m.collected, refunded: m.refunded, net: m.collected - m.refunded },
    arrivalsToday: arrivals,
    departuresToday: departures,
    openServiceRequests: openServices,
    openTickets,
    pendingRefunds,
    pendingApprovals,
    pendingHousekeeping,
  });
});

// Net revenue per month (aggregation pipeline), newest `months` months.
exports.revenue = asyncHandler(async (req, res) => {
  const months = Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 6));
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

  const rows = await Payment.aggregate([
    { $match: { createdAt: { $gte: start }, status: { $in: ["paid", "refunded"] } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        collected: { $sum: "$amount" },
        refunded: { $sum: "$refundedAmount" },
        bookings: { $sum: 1 },
      },
    },
  ]);
  const byMonth = Object.fromEntries(rows.map((r) => [r._id, r]));

  const out = [];
  for (let i = 0; i < months; i += 1) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const key = d.toISOString().slice(0, 7);
    const r = byMonth[key];
    out.push({ month: key, revenue: r ? r.collected - r.refunded : 0, bookings: r ? r.bookings : 0 });
  }
  res.json(out);
});

// % of rooms occupied for each of the next `days` days.
exports.occupancy = asyncHandler(async (req, res) => {
  const days = Math.min(60, Math.max(1, parseInt(req.query.days, 10) || 14));
  const start = todayUTC();
  const end = new Date(start.getTime() + days * DAY);

  const [totalRooms, bookings] = await Promise.all([
    Room.countDocuments({ status: { $ne: "maintenance" } }),
    Booking.find({ status: { $in: STAYED }, fromDate: { $lt: end }, toDate: { $gt: start } }).select("fromDate toDate"),
  ]);

  const out = [];
  for (let i = 0; i < days; i += 1) {
    const day = new Date(start.getTime() + i * DAY);
    const occupied = bookings.filter((b) => b.fromDate <= day && b.toDate > day).length;
    out.push({ date: dayKey(day), occupied, rate: totalRooms ? Math.min(100, Math.round((occupied / totalRooms) * 100)) : 0 });
  }
  res.json({ totalRooms, days: out });
});

exports.topRooms = asyncHandler(async (req, res) => {
  const rows = await Booking.aggregate([
    { $match: { status: { $in: STAYED } } },
    { $group: { _id: "$room", bookings: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
    { $sort: { revenue: -1 } },
    { $limit: 5 },
    { $lookup: { from: Room.collection.name, localField: "_id", foreignField: "_id", as: "room" } },
    { $unwind: "$room" },
    { $project: { _id: 0, roomNumber: "$room.roomNumber", type: "$room.type", bookings: 1, revenue: 1 } },
  ]);
  res.json(rows);
});

exports.systemHealth = () => ({
  dbState: ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] || "unknown",
  uptimeSeconds: Math.round(process.uptime()),
  memoryMB: Math.round(process.memoryUsage().rss / 1048576),
  node: process.version,
});
