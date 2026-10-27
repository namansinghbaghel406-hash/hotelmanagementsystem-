// Reviews & ratings and the notification centre.
const Review = require("../models/Review");
const Room = require("../models/Room");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { asyncHandler, HttpError } = require("../utils/errors");
const { paginate, pageResult } = require("../utils/paginate");
const { logAction } = require("../utils/log");

// ---- Reviews
async function refreshRating(roomId) {
  const [agg] = await Review.aggregate([
    { $match: { room: roomId } },
    { $group: { _id: "$room", avg: { $avg: "$rating" }, n: { $sum: 1 } } },
  ]);
  await Room.findByIdAndUpdate(roomId, { avgRating: agg ? Math.round(agg.avg * 10) / 10 : 0, reviewCount: agg ? agg.n : 0 });
}

exports.listReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10 });
  const filter = req.query.room ? { room: req.query.room } : {};
  const [items, total] = await Promise.all([
    Review.find(filter).populate("user", "name").populate("room", "roomNumber type").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(filter),
  ]);
  res.json(pageResult(items, total, page, limit));
});

exports.createReview = asyncHandler(async (req, res) => {
  const { booking: bookingId, rating, comment = "" } = req.body;
  const r = Number(rating);
  if (!bookingId || !Number.isInteger(r) || r < 1 || r > 5) throw new HttpError(400, "A booking and a rating from 1 to 5 are required");

  const booking = await Booking.findOne({ _id: bookingId, user: req.user._id });
  if (!booking) throw new HttpError(404, "Booking not found");
  if (!["checked_in", "checked_out"].includes(booking.status)) throw new HttpError(400, "You can review a room once your stay has started");
  if (await Review.exists({ booking: booking._id })) throw new HttpError(400, "You already reviewed this stay");

  const review = await Review.create({ user: req.user._id, room: booking.room, booking: booking._id, rating: r, comment: String(comment).slice(0, 1000) });
  await refreshRating(booking.room);
  res.status(201).json(review);
});

exports.deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw new HttpError(404, "Review not found");
  await refreshRating(review.room);
  logAction(req, "review_deleted", "Review", review._id, "", "warn");
  res.json({ msg: "Review deleted" });
});

// ---- Notifications
exports.listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 15 });
  const filter = { user: req.user._id };
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, read: false }),
  ]);
  res.json({ ...pageResult(items, total, page, limit), unread });
});

exports.unreadCount = asyncHandler(async (req, res) =>
  res.json({ unread: await Notification.countDocuments({ user: req.user._id, read: false }) })
);

exports.markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ msg: "Marked as read" });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ msg: "All notifications marked as read" });
});

exports.deleteNotification = asyncHandler(async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ msg: "Deleted" });
});

// Admin: announcement to a group of users.
exports.broadcast = asyncHandler(async (req, res) => {
  const { audience = "all", title, message = "" } = req.body;
  if (!title) throw new HttpError(400, "Title is required");
  const roles = { all: ["Ordinary", "Staff", "Admin"], guests: ["Ordinary"], staff: ["Staff"] }[audience];
  if (!roles) throw new HttpError(400, "Audience must be all, guests or staff");

  const users = await User.find({ userType: { $in: roles }, isActive: true }).select("_id");
  await Notification.insertMany(users.map((u) => ({ user: u._id, title, message, type: "broadcast" })));
  logAction(req, "broadcast_sent", "Notification", "", `${audience}: ${title} (${users.length} users)`);
  res.json({ msg: `Sent to ${users.length} user(s)` });
});
