const Room = require("../models/Room");
const Booking = require("../models/Booking");
const { asyncHandler, HttpError } = require("../utils/errors");
const { paginate, pageResult } = require("../utils/paginate");
const { parseDay, todayUTC } = require("../utils/dates");
const { logAction } = require("../utils/log");

const ACTIVE = Booking.ACTIVE_STATUSES;
const SORTS = {
  price_asc: { rentPerDay: 1 },
  price_desc: { rentPerDay: -1 },
  rating: { avgRating: -1, reviewCount: -1 },
};
const FIELDS = ["roomNumber", "hotel", "category", "type", "maxCount", "rentPerDay", "photos", "description", "amenities"];
const pickFields = (body) => Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

exports.getRooms = asyncHandler(async (req, res) => {
  const { from, to, type, category, hotel, minPrice, maxPrice, capacity, sort, status } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 12, max: 200 });

  const filter = {};
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (hotel) filter.hotel = hotel;
  if (status) filter.status = status;
  if (capacity) filter.maxCount = { $gte: Number(capacity) };
  if (minPrice || maxPrice) {
    filter.rentPerDay = {};
    if (minPrice) filter.rentPerDay.$gte = Number(minPrice);
    if (maxPrice) filter.rentPerDay.$lte = Number(maxPrice);
  }

  // Date search: hide rooms with an overlapping active booking, and rooms under maintenance.
  if (from || to) {
    const f = parseDay(from);
    const t = parseDay(to);
    if (!f || !t || t <= f) throw new HttpError(400, "Provide a valid check-in and check-out date (YYYY-MM-DD)");
    const busy = await Booking.distinct("room", { status: { $in: ACTIVE }, fromDate: { $lt: t }, toDate: { $gt: f } });
    filter._id = { $nin: busy };
    if (!filter.status) filter.status = { $ne: "maintenance" };
  }

  const [rooms, total] = await Promise.all([
    Room.find(filter)
      .populate("category", "name")
      .populate("hotel", "name city")
      .sort(SORTS[sort] || { roomNumber: 1 })
      .skip(skip)
      .limit(limit),
    Room.countDocuments(filter),
  ]);
  res.json({ ...pageResult(rooms, total, page, limit), rooms });
});

exports.getRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id).populate("category", "name description").populate("hotel", "name city address phone");
  if (!room) throw new HttpError(404, "Room not found");
  res.json(room);
});

exports.addRoom = asyncHandler(async (req, res) => {
  const data = pickFields(req.body);
  if (!data.roomNumber || !data.maxCount || data.rentPerDay === undefined || !data.type || !data.description) {
    throw new HttpError(400, "Room number, capacity, rent, type and description are required");
  }
  if (data.photos) data.photos = data.photos.filter(Boolean);
  if (!data.hotel) delete data.hotel;
  if (!data.category) delete data.category;
  const room = await Room.create(data);
  logAction(req, "room_created", "Room", room._id, `Room ${room.roomNumber}`);
  res.status(201).json(room);
});

exports.updateRoom = asyncHandler(async (req, res) => {
  const data = pickFields(req.body);
  if (data.hotel === "") data.hotel = null;
  if (data.category === "") data.category = null;
  const room = await Room.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!room) throw new HttpError(404, "Room not found");
  logAction(req, "room_updated", "Room", room._id, `Room ${room.roomNumber}${data.rentPerDay !== undefined ? ` rent=${data.rentPerDay}` : ""}`);
  res.json(room);
});

exports.deleteRoom = asyncHandler(async (req, res) => {
  const upcoming = await Booking.exists({ room: req.params.id, status: { $in: ACTIVE }, toDate: { $gt: todayUTC() } });
  if (upcoming) throw new HttpError(400, "This room has active or upcoming bookings");
  const room = await Room.findByIdAndDelete(req.params.id);
  if (!room) throw new HttpError(404, "Room not found");
  logAction(req, "room_deleted", "Room", room._id, `Room ${room.roomNumber}`, "warn");
  res.json({ msg: "Room deleted" });
});

// Staff/admin: room status updates (available / occupied / cleaning / maintenance)
exports.setStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["available", "occupied", "cleaning", "maintenance"].includes(status)) throw new HttpError(400, "Invalid status");
  const room = await Room.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!room) throw new HttpError(404, "Room not found");
  logAction(req, "room_status", "Room", room._id, `Room ${room.roomNumber} -> ${status}`);
  res.json(room);
});

exports.uploadImages = (req, res) => {
  if (!req.files || !req.files.length) throw new HttpError(400, "No images uploaded");
  res.json({ urls: req.files.map((f) => `/uploads/${f.filename}`) });
};
