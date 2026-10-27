const DAY = 24 * 60 * 60 * 1000;

// Accepts "YYYY-MM-DD" and returns that day at 00:00 UTC (or null if invalid).
const parseDay = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
};

const todayUTC = () => parseDay(new Date().toISOString().slice(0, 10));

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

module.exports = { DAY, parseDay, todayUTC, dayKey };
