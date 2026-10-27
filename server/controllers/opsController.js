// Hotel operations: payments, check-in/out log, housekeeping, service requests, support tickets.
const Payment = require("../models/Payment");
const CheckInOut = require("../models/CheckInOut");
const HousekeepingTask = require("../models/HousekeepingTask");
const ServiceRequest = require("../models/ServiceRequest");
const SupportTicket = require("../models/SupportTicket");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const { asyncHandler, HttpError } = require("../utils/errors");
const { paginate, pageResult } = require("../utils/paginate");
const { logAction } = require("../utils/log");
const { notify, notifyRoles } = require("../utils/notify");

const isStaff = (u) => u.userType === "Staff" || u.userType === "Admin";

// ---- Payments (admin)
exports.listPayments = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10 });
  const filter = status ? { status } : {};
  const [items, total, totals] = await Promise.all([
    Payment.find(filter).populate("user", "name email").populate("booking", "fromDate toDate status").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Payment.countDocuments(filter),
    Payment.aggregate([{ $group: { _id: null, collected: { $sum: "$amount" }, refunded: { $sum: "$refundedAmount" }, count: { $sum: 1 } } }]),
  ]);
  const t = totals[0] || { collected: 0, refunded: 0, count: 0 };
  res.json({ ...pageResult(items, total, page, limit), totals: { collected: t.collected, refunded: t.refunded, net: t.collected - t.refunded, count: t.count } });
});

// ---- Check-in / check-out log
exports.listCheckins = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10 });
  const [items, total] = await Promise.all([
    CheckInOut.find().populate("room", "roomNumber type").populate("guest", "name phone").populate("checkInBy checkOutBy", "name").sort({ checkInAt: -1 }).skip(skip).limit(limit),
    CheckInOut.countDocuments(),
  ]);
  res.json(pageResult(items, total, page, limit));
});

// ---- Housekeeping
exports.listHousekeeping = asyncHandler(async (req, res) => {
  const { status, mine } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (mine === "true") filter.assignedTo = req.user._id;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 15 });
  const [items, total] = await Promise.all([
    HousekeepingTask.find(filter).populate("room", "roomNumber type status").populate("assignedTo", "name department").sort({ status: 1, createdAt: -1 }).skip(skip).limit(limit),
    HousekeepingTask.countDocuments(filter),
  ]);
  res.json(pageResult(items, total, page, limit));
});

exports.createHousekeeping = asyncHandler(async (req, res) => {
  const { room, assignedTo, priority, notes } = req.body;
  if (!room || !(await Room.exists({ _id: room }))) throw new HttpError(400, "A valid room is required");
  const task = await HousekeepingTask.create({ room, assignedTo: assignedTo || undefined, priority, notes, createdBy: req.user._id });
  if (assignedTo) notify(assignedTo, "New housekeeping task", notes || "A room was assigned to you", "service", "/staff");
  logAction(req, "housekeeping_created", "HousekeepingTask", task._id);
  res.status(201).json(task);
});

exports.updateHousekeeping = asyncHandler(async (req, res) => {
  const task = await HousekeepingTask.findById(req.params.id);
  if (!task) throw new HttpError(404, "Task not found");
  const { status, assignedTo, priority, notes } = req.body;

  if (priority !== undefined) task.priority = priority;
  if (notes !== undefined) task.notes = notes;
  if (assignedTo !== undefined) {
    task.assignedTo = assignedTo || undefined;
    if (assignedTo) notify(assignedTo, "Task assigned to you", task.notes || "Housekeeping task", "service", "/staff");
  }
  if (status !== undefined) {
    if (!["pending", "in_progress", "done"].includes(status)) throw new HttpError(400, "Invalid status");
    task.status = status;
    if (status === "in_progress" && !task.assignedTo && req.user.userType === "Staff") task.assignedTo = req.user._id;
    if (status === "done") {
      task.completedAt = new Date();
      // A finished clean frees the room, but never overrides maintenance or an occupied room.
      await Room.updateOne({ _id: task.room, status: "cleaning" }, { status: "available" });
    }
  }
  await task.save();
  logAction(req, "housekeeping_updated", "HousekeepingTask", task._id, `status=${task.status}`);
  res.json(task);
});

// ---- Service requests
exports.createService = asyncHandler(async (req, res) => {
  const { booking: bookingId, type, description } = req.body;
  if (!bookingId || !type || !description) throw new HttpError(400, "Booking, type and description are required");
  const booking = await Booking.findOne({ _id: bookingId, user: req.user._id, status: { $in: ["booked", "checked_in"] } });
  if (!booking) throw new HttpError(400, "Choose one of your active bookings");
  const sr = await ServiceRequest.create({ user: req.user._id, booking: booking._id, room: booking.room, type, description });
  notifyRoles(["Staff", "Admin"], "New service request", `${type.replace("_", " ")}: ${description.slice(0, 80)}`, "service", "/staff");
  res.status(201).json(sr);
});

exports.myServices = asyncHandler(async (req, res) => {
  res.json(await ServiceRequest.find({ user: req.user._id }).populate("room", "roomNumber").sort({ createdAt: -1 }).limit(100));
});

exports.listServices = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 15 });
  const filter = status ? { status } : {};
  const [items, total] = await Promise.all([
    ServiceRequest.find(filter).populate("room", "roomNumber").populate("user", "name phone").populate("assignedTo", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    ServiceRequest.countDocuments(filter),
  ]);
  res.json(pageResult(items, total, page, limit));
});

exports.updateService = asyncHandler(async (req, res) => {
  const sr = await ServiceRequest.findById(req.params.id);
  if (!sr) throw new HttpError(404, "Request not found");
  const { status, assignedTo, response } = req.body;
  if (status !== undefined) {
    if (!["open", "in_progress", "resolved"].includes(status)) throw new HttpError(400, "Invalid status");
    sr.status = status;
  }
  if (assignedTo !== undefined) sr.assignedTo = assignedTo || undefined;
  if (response !== undefined) sr.response = String(response).slice(0, 500);
  await sr.save();
  if (status || response) notify(sr.user, "Service request update", `Status: ${sr.status.replace("_", " ")}${sr.response ? ` - ${sr.response}` : ""}`, "service", "/services");
  logAction(req, "service_updated", "ServiceRequest", sr._id, `status=${sr.status}`);
  res.json(sr);
});

// ---- Support tickets (customer support + communication)
exports.createTicket = asyncHandler(async (req, res) => {
  const { subject, text } = req.body;
  if (!subject || !text) throw new HttpError(400, "Subject and message are required");
  const ticket = await SupportTicket.create({
    user: req.user._id,
    subject,
    messages: [{ sender: req.user._id, senderName: req.user.name, role: req.user.userType, text }],
  });
  notifyRoles(["Staff", "Admin"], "New support ticket", subject, "support", "/staff");
  res.status(201).json(ticket);
});

exports.listTickets = asyncHandler(async (req, res) => {
  const filter = isStaff(req.user) ? {} : { user: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 15 });
  const [items, total] = await Promise.all([
    SupportTicket.find(filter).populate("user", "name email").sort({ updatedAt: -1 }).skip(skip).limit(limit),
    SupportTicket.countDocuments(filter),
  ]);
  res.json(pageResult(items, total, page, limit));
});

const loadTicket = async (id, user) => {
  const t = await SupportTicket.findById(id).populate("user", "name email");
  if (!t) throw new HttpError(404, "Ticket not found");
  if (!isStaff(user) && String(t.user._id) !== String(user._id)) throw new HttpError(403, "This is not your ticket");
  return t;
};

exports.getTicket = asyncHandler(async (req, res) => res.json(await loadTicket(req.params.id, req.user)));

exports.replyTicket = asyncHandler(async (req, res) => {
  const t = await loadTicket(req.params.id, req.user);
  if (!req.body.text) throw new HttpError(400, "Message cannot be empty");
  if (t.status === "closed") throw new HttpError(400, "This ticket is closed");
  t.messages.push({ sender: req.user._id, senderName: req.user.name, role: req.user.userType, text: req.body.text });
  await t.save();
  if (isStaff(req.user)) notify(t.user._id, "Support replied", t.subject, "support", "/support");
  else notifyRoles(["Staff", "Admin"], "Guest replied on a ticket", t.subject, "support", "/staff");
  res.json(t);
});

exports.closeTicket = asyncHandler(async (req, res) => {
  const t = await loadTicket(req.params.id, req.user);
  t.status = "closed";
  await t.save();
  logAction(req, "ticket_closed", "SupportTicket", t._id);
  res.json(t);
});
