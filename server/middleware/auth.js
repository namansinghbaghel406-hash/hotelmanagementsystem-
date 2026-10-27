const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ msg: "Not authorized, no token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ msg: "User no longer exists" });
    if (!user.isActive) return res.status(403).json({ msg: "This account has been disabled" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
};

const requireRole =
  (...roles) =>
  (req, res, next) =>
    req.user && roles.includes(req.user.userType)
      ? next()
      : res.status(403).json({ msg: "You do not have access to this resource" });

module.exports = {
  protect,
  requireRole,
  adminOnly: requireRole("Admin"),
  staffOrAdmin: requireRole("Staff", "Admin"),
  guestOnly: requireRole("Ordinary"),
};
