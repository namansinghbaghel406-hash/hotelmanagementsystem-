const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { asyncHandler, HttpError } = require("../utils/errors");
const { logAction } = require("../utils/log");
const { sendMail } = require("../utils/mailer");

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  userType: u.userType,
  department: u.department,
  emailVerified: u.emailVerified,
  createdAt: u.createdAt,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.signUp = asyncHandler(async (req, res) => {
  const { name, email, password, phone, userType = "Ordinary" } = req.body;
  if (!name || !email || !password || !phone) throw new HttpError(400, "All fields are required");
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Enter a valid email address");
  if (String(password).length < 6) throw new HttpError(400, "Password must be at least 6 characters");
  if (!["Ordinary", "Staff", "Admin"].includes(userType)) throw new HttpError(400, "Invalid user type");
  if (userType !== "Ordinary" && process.env.ALLOW_PRIVILEGED_SIGNUP !== "true") {
    throw new HttpError(403, "Staff and admin accounts are created by an administrator");
  }

  if (await User.findOne({ email: String(email).toLowerCase() })) {
    throw new HttpError(400, "Email already registered");
  }

  const verifyToken = crypto.randomBytes(24).toString("hex");
  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(String(password), 10),
    phone,
    userType,
    verifyToken,
  });

  const link = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify/${verifyToken}`;
  sendMail({
    to: user.email,
    subject: "Verify your HotelPro email",
    text: `Hi ${user.name},\n\nPlease confirm your email address:\n${link}\n`,
  });
  if (userType !== "Ordinary") {
    logAction({ user, ip: req.ip }, "privileged_signup", "User", user._id, `${userType} account self-registered`, "warn");
  }

  res.status(201).json({ msg: "User registered successfully", user: publicUser(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new HttpError(400, "Email and password are required");

  const user = await User.findOne({ email: String(email).toLowerCase() });
  const ok = user && (await bcrypt.compare(String(password), user.password));
  if (!ok) {
    logAction(req, "login_failed", "User", user ? user._id : "", `email: ${String(email).slice(0, 80)}`, "warn");
    throw new HttpError(400, "Invalid credentials");
  }
  if (!user.isActive) throw new HttpError(403, "This account has been disabled");
  if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.emailVerified && user.userType === "Ordinary") {
    throw new HttpError(403, "Please verify your email first (check your inbox)");
  }

  req.user = user; // so the audit log records who logged in (and from which IP)
  logAction(req, "login", "User", user._id, user.email);
  res.json({ msg: "Login successful", token: signToken(user), user: publicUser(user) });
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findOne({ verifyToken: req.params.token }).select("+verifyToken");
  if (!user) throw new HttpError(400, "This verification link is invalid or already used");
  user.emailVerified = true;
  user.verifyToken = undefined;
  await user.save();
  res.json({ msg: "Email verified. You can log in now." });
});

exports.me = (req, res) => res.json({ user: publicUser(req.user) });

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (name !== undefined) {
    if (!String(name).trim()) throw new HttpError(400, "Name cannot be empty");
    req.user.name = name;
  }
  if (phone !== undefined) {
    if (!String(phone).trim()) throw new HttpError(400, "Phone cannot be empty");
    req.user.phone = phone;
  }
  await req.user.save();
  res.json({ msg: "Profile updated", user: publicUser(req.user) });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new HttpError(400, "Both passwords are required");
  if (String(newPassword).length < 6) throw new HttpError(400, "New password must be at least 6 characters");

  const user = await User.findById(req.user._id); // includes password hash
  if (!(await bcrypt.compare(String(currentPassword), user.password))) {
    logAction(req, "password_change_failed", "User", user._id, "wrong current password", "warn");
    throw new HttpError(400, "Current password is incorrect");
  }
  user.password = await bcrypt.hash(String(newPassword), 10);
  await user.save();
  logAction(req, "password_changed", "User", user._id);
  res.json({ msg: "Password updated" });
});

exports.publicUser = publicUser;
