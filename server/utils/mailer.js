// Email is optional. With no SMTP_HOST set, messages are printed to the server console,
// which is enough to test verification links and booking confirmations locally.
let transporter;

const getTransporter = () => {
  if (transporter !== undefined) return transporter;
  if (!process.env.SMTP_HOST) return (transporter = null);
  try {
    const nodemailer = require("nodemailer");
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  } catch (e) {
    console.warn("nodemailer is not installed; emails will be printed instead");
    transporter = null;
  }
  return transporter;
};

exports.sendMail = async ({ to, subject, text }) => {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[mail] to=${to}\n[mail] subject=${subject}\n${text}\n`);
    return false;
  }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || "HotelPro <no-reply@hotelpro.local>",
      to,
      subject,
      text,
    });
    return true;
  } catch (e) {
    console.error("mail error:", e.message);
    return false;
  }
};
