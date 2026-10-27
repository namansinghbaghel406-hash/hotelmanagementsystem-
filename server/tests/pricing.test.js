// Run with: npm test   (no database or extra packages needed)
const assert = require("assert");
const { quote } = require("../utils/pricing");
const { parseDay } = require("../utils/dates");

const d = parseDay;

// 1) Plain stay, no rules, no tax: 3 nights x 1000
let q = quote({ baseRate: 1000, roomType: "Delux", from: d("2026-10-01"), to: d("2026-10-04") });
assert.strictEqual(q.totalDays, 3);
assert.strictEqual(q.subtotal, 3000);
assert.strictEqual(q.totalAmount, 3000);

// 2) 12% tax
q = quote({ baseRate: 1000, roomType: "Delux", from: d("2026-10-01"), to: d("2026-10-04"), taxRate: 12 });
assert.strictEqual(q.tax, 360);
assert.strictEqual(q.totalAmount, 3360);

// 3) Seasonal +50% on Oct 2-3 only (inclusive), stay Oct 1-4 => 1000 + 1500 + 1500
const rules = [{ name: "Peak", startDate: d("2026-10-02"), endDate: d("2026-10-03"), adjustmentPercent: 50, roomType: "All", active: true }];
q = quote({ baseRate: 1000, roomType: "Delux", from: d("2026-10-01"), to: d("2026-10-04"), rules });
assert.deepStrictEqual(q.nights.map((n) => n.rate), [1000, 1500, 1500]);
assert.strictEqual(q.nights[1].rule, "Peak");

// 4) Check-out day is not charged: stay ending on the first rule day is unaffected
q = quote({ baseRate: 1000, roomType: "Delux", from: d("2026-10-01"), to: d("2026-10-02"), rules });
assert.strictEqual(q.subtotal, 1000);

// 5) Rule limited to another room type is ignored; inactive rule is ignored; discount works
const typed = [{ name: "NonDelux promo", startDate: d("2026-10-01"), endDate: d("2026-10-31"), adjustmentPercent: -20, roomType: "Non-Delux", active: true }];
q = quote({ baseRate: 1000, roomType: "Delux", from: d("2026-10-01"), to: d("2026-10-03"), rules: typed });
assert.strictEqual(q.subtotal, 2000);
q = quote({ baseRate: 1000, roomType: "Non-Delux", from: d("2026-10-01"), to: d("2026-10-03"), rules: typed });
assert.strictEqual(q.subtotal, 1600);
q = quote({ baseRate: 1000, roomType: "Non-Delux", from: d("2026-10-01"), to: d("2026-10-03"), rules: [{ ...typed[0], active: false }] });
assert.strictEqual(q.subtotal, 2000);

// 6) parseDay rejects bad input
assert.strictEqual(parseDay("2026-13-45"), null);
assert.strictEqual(parseDay("tomorrow"), null);

console.log("pricing tests passed");
