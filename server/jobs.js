// Background jobs (run inside the API process; move to a queue/worker when you scale out).
const Booking = require("./models/Booking");
const { notify } = require("./utils/notify");
const { sendMail } = require("./utils/mailer");
const { todayUTC, DAY } = require("./utils/dates");

// Once an hour: remind guests whose stay starts tomorrow.
async function sendArrivalReminders() {
  const tomorrow = new Date(todayUTC().getTime() + DAY);
  const dayAfter = new Date(tomorrow.getTime() + DAY);
  const due = await Booking.find({ status: "booked", reminderSent: false, fromDate: { $gte: tomorrow, $lt: dayAfter } })
    .populate("user", "email name")
    .populate("room", "roomNumber");

  for (const b of due) {
    notify(b.user._id, "See you tomorrow", `Your stay in room ${b.room.roomNumber} starts tomorrow.`, "booking", "/user/bookings");
    sendMail({
      to: b.user.email,
      subject: "Your stay starts tomorrow",
      text: `Hi ${b.user.name},\n\nThis is a reminder that your stay in room ${b.room.roomNumber} starts tomorrow.`,
    });
    b.reminderSent = true;
    await b.save();
  }
  if (due.length) console.log(`[jobs] sent ${due.length} arrival reminder(s)`);
}

exports.start = () => {
  const run = () => sendArrivalReminders().catch((e) => console.error("[jobs] reminder error:", e.message));
  setTimeout(run, 10 * 1000).unref();
  setInterval(run, 60 * 60 * 1000).unref();
};
