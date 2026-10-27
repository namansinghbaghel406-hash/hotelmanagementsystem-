const express = require("express");
const { protect, adminOnly, staffOrAdmin, guestOnly } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");
const upload = require("../middleware/upload");

const auth = require("../controllers/authController");
const users = require("../controllers/userController");
const settings = require("../controllers/settingController");
const catalog = require("../controllers/catalogController");
const rooms = require("../controllers/roomController");
const bookings = require("../controllers/bookingController");
const ops = require("../controllers/opsController");
const engage = require("../controllers/engagementController");
const reports = require("../controllers/reportController");
const admin = require("../controllers/adminController");

const router = express.Router();

const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many login attempts. Try again in 15 minutes." });
const signupLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: "Too many sign-ups from this address. Try again later." });

// ---- Auth & profile
router.post("/auth/signup", signupLimit, auth.signUp);
router.post("/auth/login", loginLimit, auth.login);
router.get("/auth/verify/:token", auth.verifyEmail);
router.get("/auth/me", protect, auth.me);
router.put("/auth/profile", protect, auth.updateProfile);
router.put("/auth/password", protect, auth.changePassword);

// ---- Platform settings
router.get("/settings/public", settings.getPublic);
router.get("/settings", protect, adminOnly, settings.getSettings);
router.put("/settings", protect, adminOnly, settings.updateSettings);

// ---- User & staff management
router.get("/users/staff", protect, staffOrAdmin, users.listStaff);
router.get("/users", protect, adminOnly, users.listUsers);
router.post("/users", protect, adminOnly, users.createUser);
router.put("/users/:id", protect, adminOnly, users.updateUser);
router.delete("/users/:id", protect, adminOnly, users.deleteUser);

// ---- Hotels, categories, seasonal pricing
router.get("/hotels", catalog.listHotels);
router.post("/hotels", protect, adminOnly, catalog.createHotel);
router.put("/hotels/:id", protect, adminOnly, catalog.updateHotel);
router.delete("/hotels/:id", protect, adminOnly, catalog.deleteHotel);

router.get("/categories", catalog.listCategories);
router.post("/categories", protect, adminOnly, catalog.createCategory);
router.put("/categories/:id", protect, adminOnly, catalog.updateCategory);
router.delete("/categories/:id", protect, adminOnly, catalog.deleteCategory);

router.get("/seasonal", protect, staffOrAdmin, catalog.listSeasonal);
router.post("/seasonal", protect, adminOnly, catalog.createSeasonal);
router.put("/seasonal/:id", protect, adminOnly, catalog.updateSeasonal);
router.delete("/seasonal/:id", protect, adminOnly, catalog.deleteSeasonal);

// ---- Rooms
router.get("/rooms", rooms.getRooms);
router.post("/rooms/upload", protect, adminOnly, upload.array("images", 5), rooms.uploadImages);
router.get("/rooms/:id", rooms.getRoom);
router.post("/rooms", protect, adminOnly, rooms.addRoom);
router.put("/rooms/:id", protect, adminOnly, rooms.updateRoom);
router.delete("/rooms/:id", protect, adminOnly, rooms.deleteRoom);
router.put("/rooms/:id/status", protect, staffOrAdmin, rooms.setStatus);

// ---- Bookings
router.post("/bookings/quote", protect, bookings.quoteBooking);
router.post("/bookings", protect, guestOnly, bookings.createBooking);
router.get("/bookings/mine", protect, bookings.myBookings);
router.get("/bookings", protect, staffOrAdmin, bookings.allBookings);
router.get("/bookings/:id", protect, bookings.getBooking);
router.get("/bookings/:id/invoice", protect, bookings.getInvoice);
router.post("/bookings/:id/cancel", protect, bookings.cancelBooking);
router.post("/bookings/:id/approve", protect, staffOrAdmin, bookings.approveBooking);
router.put("/bookings/:id/modify", protect, staffOrAdmin, bookings.modifyBooking);
router.put("/bookings/:id/refund", protect, staffOrAdmin, bookings.processRefund);
router.post("/bookings/:id/checkin", protect, staffOrAdmin, bookings.checkIn);
router.post("/bookings/:id/checkout", protect, staffOrAdmin, bookings.checkOut);

// ---- Payments, check-in log
router.get("/payments", protect, adminOnly, ops.listPayments);
router.get("/checkins", protect, staffOrAdmin, ops.listCheckins);

// ---- Housekeeping & service requests
router.get("/housekeeping", protect, staffOrAdmin, ops.listHousekeeping);
router.post("/housekeeping", protect, staffOrAdmin, ops.createHousekeeping);
router.put("/housekeeping/:id", protect, staffOrAdmin, ops.updateHousekeeping);

router.post("/services", protect, guestOnly, ops.createService);
router.get("/services/mine", protect, ops.myServices);
router.get("/services", protect, staffOrAdmin, ops.listServices);
router.put("/services/:id", protect, staffOrAdmin, ops.updateService);

// ---- Support tickets
router.post("/support", protect, ops.createTicket);
router.get("/support", protect, ops.listTickets);
router.get("/support/:id", protect, ops.getTicket);
router.post("/support/:id/reply", protect, ops.replyTicket);
router.put("/support/:id/close", protect, ops.closeTicket);

// ---- Reviews & notifications
router.get("/reviews", engage.listReviews);
router.post("/reviews", protect, guestOnly, engage.createReview);
router.delete("/reviews/:id", protect, adminOnly, engage.deleteReview);

router.get("/notifications", protect, engage.listNotifications);
router.get("/notifications/unread-count", protect, engage.unreadCount);
router.put("/notifications/read-all", protect, engage.markAllRead);
router.post("/notifications/broadcast", protect, adminOnly, engage.broadcast);
router.put("/notifications/:id/read", protect, engage.markRead);
router.delete("/notifications/:id", protect, engage.deleteNotification);

// ---- Reports, logs, security
router.get("/reports/summary", protect, staffOrAdmin, reports.summary);
router.get("/reports/occupancy", protect, staffOrAdmin, reports.occupancy);
router.get("/reports/revenue", protect, adminOnly, reports.revenue);
router.get("/reports/top-rooms", protect, adminOnly, reports.topRooms);
router.get("/admin/logs", protect, adminOnly, admin.listLogs);
router.get("/admin/security", protect, adminOnly, admin.security);

module.exports = router;
