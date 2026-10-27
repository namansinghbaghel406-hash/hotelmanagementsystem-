const Notification = require("../models/Notification");
const User = require("../models/User");

exports.notify = (userId, title, message = "", type = "info", link = "") =>
  Notification.create({ user: userId, title, message, type, link }).catch(() => {});

exports.notifyRoles = async (roles, title, message = "", type = "info", link = "") => {
  try {
    const users = await User.find({ userType: { $in: roles }, isActive: true }).select("_id");
    if (!users.length) return;
    await Notification.insertMany(users.map((u) => ({ user: u._id, title, message, type, link })));
  } catch (e) {
    /* notifications are best-effort */
  }
};
