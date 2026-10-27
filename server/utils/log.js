const AdminLog = require("../models/AdminLog");

// Fire-and-forget audit logging. Never throws, never blocks the request.
exports.logAction = (req, action, entity = "", entityId = null, details = "", level = "info") =>
  AdminLog.create({
    user: req && req.user ? req.user._id : undefined,
    userName: req && req.user ? req.user.name : undefined,
    role: req && req.user ? req.user.userType : undefined,
    action,
    entity,
    entityId: entityId ? String(entityId) : "",
    details: String(details).slice(0, 500),
    level,
    ip: req ? req.ip : undefined,
  }).catch(() => {});
