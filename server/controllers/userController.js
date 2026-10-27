const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { asyncHandler, HttpError, escapeRegex } = require("../utils/errors");
const { paginate, pageResult } = require("../utils/paginate");
const { logAction } = require("../utils/log");
const { publicUser } = require("./authController");

exports.listUsers = asyncHandler(async (req, res) => {
  const { q, role } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10 });
  const filter = {};
  if (role) filter.userType = role;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json(pageResult(items, total, page, limit));
});

// Staff directory used for task assignment (Staff and Admin may read it).
exports.listStaff = asyncHandler(async (req, res) => {
  const staff = await User.find({ userType: "Staff", isActive: true }).select("name department email").sort({ name: 1 });
  res.json(staff);
});

exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, userType = "Ordinary", department = "" } = req.body;
  if (!name || !email || !password || !phone) throw new HttpError(400, "Name, email, password and phone are required");
  if (String(password).length < 6) throw new HttpError(400, "Password must be at least 6 characters");
  if (!["Ordinary", "Staff", "Admin"].includes(userType)) throw new HttpError(400, "Invalid user type");
  if (await User.findOne({ email: String(email).toLowerCase() })) throw new HttpError(400, "Email already registered");

  const user = await User.create({
    name,
    email,
    phone,
    userType,
    department,
    password: await bcrypt.hash(String(password), 10),
    emailVerified: true, // created by an admin
  });
  logAction(req, "user_created", "User", user._id, `${userType}: ${user.email}`);
  res.status(201).json(publicUser(user));
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, "User not found");

  const { name, phone, userType, department, isActive } = req.body;
  const isSelf = String(user._id) === String(req.user._id);
  if (isSelf && (isActive === false || (userType && userType !== user.userType))) {
    throw new HttpError(400, "You cannot disable or change the role of your own account");
  }
  if (userType !== undefined && !["Ordinary", "Staff", "Admin"].includes(userType)) {
    throw new HttpError(400, "Invalid user type");
  }

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (userType !== undefined) user.userType = userType;
  if (department !== undefined) user.department = department;
  if (isActive !== undefined) user.isActive = Boolean(isActive);
  await user.save();

  logAction(req, "user_updated", "User", user._id, JSON.stringify({ userType, isActive, department }));
  res.json(publicUser(user));
});

exports.deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new HttpError(400, "You cannot delete your own account");
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new HttpError(404, "User not found");
  logAction(req, "user_deleted", "User", user._id, user.email, "warn");
  res.json({ msg: "User deleted" });
});
