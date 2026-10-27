import { useNavigate, useParams } from "react-router-dom";
import Navbar from "./common/Navbar";
import StatusBadge from "./common/StatusBadge";
import { Loading, ErrorNote } from "./common/Misc";
import { useFetch } from "../hooks";
import { money, fmtDate, fmtDateTime } from "../format";

export default function Invoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: inv, loading, error } = useFetch(`/bookings/${id}/invoice`);

  return (
    <>
      <Navbar />
      <div className="container py-4">
        <div className="d-flex gap-2 mb-3 no-print">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(-1)}>Back</button>
          {inv && <button className="btn btn-primary btn-sm" onClick={() => window.print()}>Print / Save as PDF</button>}
        </div>
        <ErrorNote error={error} />
        {loading ? <Loading /> : inv && (
          <div className="card shadow-sm invoice-sheet">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between flex-wrap gap-2">
                <div>
                  <h3 className="mb-0">{inv.siteName}</h3>
                  {inv.hotel && (
                    <div className="small text-muted">
                      {inv.hotel.name}<br />{inv.hotel.address}, {inv.hotel.city}<br />{inv.hotel.phone}
                    </div>
                  )}
                </div>
                <div className="text-md-end">
                  <h4 className="mb-0">INVOICE</h4>
                  <div>{inv.invoiceNumber}</div>
                  <div className="small text-muted">Issued {fmtDateTime(inv.issuedAt)}</div>
                </div>
              </div>
              <hr />
              <div className="row mb-3">
                <div className="col-sm-6">
                  <div className="text-muted small">Billed to</div>
                  <div className="fw-semibold">{inv.guest.name}</div>
                  <div className="small">{inv.guest.email}<br />{inv.guest.phone}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-muted small">Stay</div>
                  <div className="fw-semibold">Room {inv.room.number} ({inv.room.type})</div>
                  <div className="small">{fmtDate(inv.fromDate)} to {fmtDate(inv.toDate)} · {inv.totalDays} night(s)</div>
                  <div className="mt-1"><StatusBadge value={inv.bookingStatus} /></div>
                </div>
              </div>

              <table className="table table-sm">
                <thead><tr><th>Night</th><th>Rate note</th><th className="text-end">Amount</th></tr></thead>
                <tbody>
                  {inv.nights.map((n) => (
                    <tr key={n.date}><td>{fmtDate(n.date)}</td><td className="text-muted small">{n.rule || "Standard rate"}</td><td className="text-end">{money(n.rate)}</td></tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan="2" className="text-end">Subtotal</td><td className="text-end">{money(inv.subtotal)}</td></tr>
                  <tr><td colSpan="2" className="text-end">Tax ({inv.taxRate}%)</td><td className="text-end">{money(inv.tax)}</td></tr>
                  <tr className="fw-bold"><td colSpan="2" className="text-end">Total</td><td className="text-end">{money(inv.totalAmount)}</td></tr>
                </tfoot>
              </table>

              {inv.payment && (
                <p className="small mb-1">
                  Payment: <StatusBadge value={inv.payment.status} /> · card ending {inv.payment.last4} · ref {inv.payment.transactionId}
                  {inv.payment.refundedAmount > 0 && <> · refunded {money(inv.payment.refundedAmount)}</>}
                </p>
              )}
              {inv.refund?.status && inv.refund.status !== "none" && (
                <p className="small mb-0">Refund: <StatusBadge value={inv.refund.status} /> {inv.refund.note && `· ${inv.refund.note}`}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
