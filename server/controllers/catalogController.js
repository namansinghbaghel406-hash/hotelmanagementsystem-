// Hotels, room categories and seasonal pricing rules: simple admin-managed catalogs.
const Hotel = require("../models/Hotel");
const RoomCategory = require("../models/RoomCategory");
const SeasonalPrice = require("../models/SeasonalPrice");
const Room = require("../models/Room");
const { asyncHandler, HttpError } = require("../utils/errors");
const { logAction } = require("../utils/log");
const { parseDay } = require("../utils/dates");

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

// ---- Hotels
exports.listHotels = asyncHandler(async (req, res) => res.json(await Hotel.find().sort({ name: 1 })));

exports.createHotel = asyncHandler(async (req, res) => {
  if (!req.body.name) throw new HttpError(400, "Hotel name is required");
  const hotel = await Hotel.create(pick(req.body, ["name", "address", "city", "phone", "email", "description", "amenities"]));
  logAction(req, "hotel_created", "Hotel", hotel._id, hotel.name);
  res.status(201).json(hotel);
});

exports.updateHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findByIdAndUpdate(
    req.params.id,
    pick(req.body, ["name", "address", "city", "phone", "email", "description", "amenities"]),
    { new: true, runValidators: true }
  );
  if (!hotel) throw new HttpError(404, "Hotel not found");
  logAction(req, "hotel_updated", "Hotel", hotel._id, hotel.name);
  res.json(hotel);
});

exports.deleteHotel = asyncHandler(async (req, res) => {
  if (await Room.exists({ hotel: req.params.id })) throw new HttpError(400, "Move or delete this hotel's rooms first");
  const hotel = await Hotel.findByIdAndDelete(req.params.id);
  if (!hotel) throw new HttpError(404, "Hotel not found");
  logAction(req, "hotel_deleted", "Hotel", hotel._id, hotel.name, "warn");
  res.json({ msg: "Hotel deleted" });
});

// ---- Room categories
exports.listCategories = asyncHandler(async (req, res) => res.json(await RoomCategory.find().sort({ name: 1 })));

exports.createCategory = asyncHandler(async (req, res) => {
  if (!req.body.name) throw new HttpError(400, "Category name is required");
  const c = await RoomCategory.create(pick(req.body, ["name", "description", "amenities"]));
  logAction(req, "category_created", "RoomCategory", c._id, c.name);
  res.status(201).json(c);
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const c = await RoomCategory.findByIdAndUpdate(req.params.id, pick(req.body, ["name", "description", "amenities"]), {
    new: true,
    runValidators: true,
  });
  if (!c) throw new HttpError(404, "Category not found");
  logAction(req, "category_updated", "RoomCategory", c._id, c.name);
  res.json(c);
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  if (await Room.exists({ category: req.params.id })) throw new HttpError(400, "Some rooms still use this category");
  const c = await RoomCategory.findByIdAndDelete(req.params.id);
  if (!c) throw new HttpError(404, "Category not found");
  logAction(req, "category_deleted", "RoomCategory", c._id, c.name, "warn");
  res.json({ msg: "Category deleted" });
});

// ---- Seasonal pricing
exports.listSeasonal = asyncHandler(async (req, res) => res.json(await SeasonalPrice.find().sort({ startDate: -1 })));

const seasonalFields = (body) => {
  const start = parseDay(body.startDate);
  const end = parseDay(body.endDate);
  if (!body.name || !start || !end) throw new HttpError(400, "Name, start date and end date (YYYY-MM-DD) are required");
  if (end < start) throw new HttpError(400, "End date cannot be before start date");
  const pct = Number(body.adjustmentPercent);
  if (isNaN(pct) || pct < -90 || pct > 500) throw new HttpError(400, "Adjustment must be between -90 and 500 percent");
  return {
    name: body.name,
    startDate: start,
    endDate: end,
    adjustmentPercent: pct,
    roomType: body.roomType || "All",
    active: body.active === undefined ? true : Boolean(body.active),
  };
};

exports.createSeasonal = asyncHandler(async (req, res) => {
  const rule = await SeasonalPrice.create(seasonalFields(req.body));
  logAction(req, "seasonal_created", "SeasonalPrice", rule._id, `${rule.name} ${rule.adjustmentPercent}%`);
  res.status(201).json(rule);
});

exports.updateSeasonal = asyncHandler(async (req, res) => {
  const rule = await SeasonalPrice.findById(req.params.id);
  if (!rule) throw new HttpError(404, "Rule not found");
  Object.assign(rule, seasonalFields({ ...rule.toObject(), ...req.body, startDate: req.body.startDate || rule.startDate.toISOString().slice(0, 10), endDate: req.body.endDate || rule.endDate.toISOString().slice(0, 10) }));
  await rule.save();
  logAction(req, "seasonal_updated", "SeasonalPrice", rule._id, rule.name);
  res.json(rule);
});

exports.deleteSeasonal = asyncHandler(async (req, res) => {
  const rule = await SeasonalPrice.findByIdAndDelete(req.params.id);
  if (!rule) throw new HttpError(404, "Rule not found");
  logAction(req, "seasonal_deleted", "SeasonalPrice", rule._id, rule.name, "warn");
  res.json({ msg: "Rule deleted" });
});
