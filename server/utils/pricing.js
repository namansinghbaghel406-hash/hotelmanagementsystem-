const { DAY, dayKey } = require("./dates");

/**
 * Price a stay night by night. A night is charged at the room's base rate,
 * adjusted by the first active seasonal rule that covers that night
 * (rules are expected newest-first, so newer rules win).
 *
 * `to` is the check-out day (not charged). Rules cover startDate..endDate inclusive.
 */
function quote({ baseRate, roomType, from, to, rules = [], taxRate = 0 }) {
  const nights = [];
  let subtotal = 0;

  for (let t = from.getTime(); t < to.getTime(); t += DAY) {
    const day = new Date(t);
    const rule = rules.find(
      (r) =>
        r.active !== false &&
        t >= new Date(r.startDate).getTime() &&
        t <= new Date(r.endDate).getTime() &&
        (!r.roomType || r.roomType === "All" || r.roomType === roomType)
    );
    const rate = Math.max(0, Math.round(baseRate * (1 + (rule ? rule.adjustmentPercent : 0) / 100)));
    subtotal += rate;
    nights.push({ date: dayKey(day), rate, rule: rule ? rule.name : "" });
  }

  const tax = Math.round((subtotal * taxRate) / 100);
  return { nights, totalDays: nights.length, subtotal, taxRate, tax, totalAmount: subtotal + tax };
}

module.exports = { quote };
