export const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "-");

export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("en-IN") : "-");

export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const label = (s) => String(s || "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
