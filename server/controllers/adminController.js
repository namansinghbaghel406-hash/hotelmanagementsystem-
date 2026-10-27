const AdminLog = require("../models/AdminLog");
const User = require("../models/User");
const { asyncHandler, escapeRegex } = require("../utils/errors");
const { paginate, pageResult } = require("../utils/paginate");
const { systemHealth } = require("./reportController");

exports.listLogs = asyncHandler(async (req, res) => {
  const { level, action, q } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 15 });
  const filter = {};
  if (level) filter.level = level;
  if (action) filter.action = action;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ userName: rx }, { details: rx }, { action: rx }];
  }
  const [items, total] = await Promise.all([
    AdminLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AdminLog.countDocuments(filter),
  ]);
  res.json(pageResult(items, total, page, limit));
});

// Security monitoring + system health + simple user activity
exports.security = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [failedLogins, errors, recentFailed, logins, disabled, privileged] = await Promise.all([
    AdminLog.countDocuments({ action: "login_failed", createdAt: { $gte: since } }),
    AdminLog.countDocuments({ level: "error", createdAt: { $gte: since } }),
    AdminLog.find({ action: "login_failed" }).sort({ createdAt: -1 }).limit(10),
    AdminLog.countDocuments({ action: "login", createdAt: { $gte: since } }),
    User.countDocuments({ isActive: false }),
    User.countDocuments({ userType: { $in: ["Staff", "Admin"] } }),
  ]);
  res.json({ failedLogins24h: failedLogins, errors24h: errors, logins24h: logins, disabledUsers: disabled, privilegedUsers: privileged, recentFailed, system: systemHealth() });
});
