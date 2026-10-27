const Setting = require("../models/Setting");
const { asyncHandler, HttpError } = require("../utils/errors");
const { logAction } = require("../utils/log");

exports.getPublic = asyncHandler(async (req, res) => {
  const s = await Setting.get();
  res.json({
    siteName: s.siteName,
    taxRate: s.taxRate,
    currency: s.currency,
    checkInTime: s.checkInTime,
    checkOutTime: s.checkOutTime,
    requireApproval: s.requireApproval,
    allowPrivilegedSignup: process.env.ALLOW_PRIVILEGED_SIGNUP === "true",
  });
});

exports.getSettings = asyncHandler(async (req, res) => res.json(await Setting.get()));

exports.updateSettings = asyncHandler(async (req, res) => {
  const s = await Setting.get();
  const { siteName, taxRate, requireApproval, checkInTime, checkOutTime, currency } = req.body;

  if (taxRate !== undefined) {
    const n = Number(taxRate);
    if (isNaN(n) || n < 0 || n > 100) throw new HttpError(400, "Tax rate must be between 0 and 100");
    s.taxRate = n;
  }
  if (siteName !== undefined) s.siteName = String(siteName).trim() || s.siteName;
  if (requireApproval !== undefined) s.requireApproval = Boolean(requireApproval);
  if (checkInTime !== undefined) s.checkInTime = checkInTime;
  if (checkOutTime !== undefined) s.checkOutTime = checkOutTime;
  if (currency !== undefined) s.currency = currency;
  await s.save();

  logAction(req, "settings_updated", "Setting", s._id, JSON.stringify(req.body));
  res.json(s);
});
