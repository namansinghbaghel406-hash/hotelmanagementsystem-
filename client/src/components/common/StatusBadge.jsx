import { label } from "../../format";

const COLORS = {
  // bookings
  pending: "warning text-dark",
  booked: "primary",
  checked_in: "success",
  checked_out: "secondary",
  cancelled: "danger",
  // rooms
  available: "success",
  occupied: "danger",
  cleaning: "warning text-dark",
  maintenance: "dark",
  // refunds / payments
  requested: "warning text-dark",
  approved: "success",
  rejected: "danger",
  paid: "success",
  refunded: "info text-dark",
  failed: "danger",
  // tasks / tickets
  in_progress: "info text-dark",
  done: "success",
  open: "warning text-dark",
  resolved: "success",
  closed: "secondary",
  // priorities
  high: "danger",
  normal: "secondary",
  low: "light text-dark border",
};

export default function StatusBadge({ value }) {
  if (!value || value === "none") return null;
  return <span className={`badge bg-${COLORS[value] || "secondary"}`}>{label(value)}</span>;
}
