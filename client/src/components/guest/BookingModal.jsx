import { useEffect, useState } from "react";
import { Modal, ErrorNote, Loading } from "../common/Misc";
import api, { errMsg } from "../../api";
import { money, fmtDate } from "../../format";

export default function BookingModal({ room, dates, onClose, onBooked }) {
  const [card, setCard] = useState({ cardHolderName: "", cardNumber: "", expMonthYear: "", cvv: "" });
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // The server prices the stay (seasonal rates + tax), so the guest sees exactly what they will pay.
  useEffect(() => {
    api
      .post("/bookings/quote", { roomId: room._id, fromDate: dates.from, toDate: dates.to })
      .then((r) => setQuote(r.data))
      .catch((e) => setError(errMsg(e)));
  }, [room._id, dates.from, dates.to]);

  const onChange = (e) => setCard({ ...card, [e.target.name]: e.target.value });

  const pay = async (e) => {
    e.preventDefault();
    setError("");
    const digits = card.cardNumber.replace(/\s+/g, "");
    if (!card.cardHolderName || !digits || !card.expMonthYear || !card.cvv) return setError("All payment fields are required");
    if (!/^\d{12,19}$/.test(digits)) return setError("Enter a valid card number");
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expMonthYear)) return setError("Expiry must look like MM/YY");
    if (!/^\d{3,4}$/.test(card.cvv)) return setError("Enter a valid CVV");

    setLoading(true);
    try {
      const { data } = await api.post("/bookings", { roomId: room._id, fromDate: dates.from, toDate: dates.to, ...card, cardNumber: digits });
      onBooked(data.msg);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const blocked = quote && !quote.available;

  return (
    <Modal
      title={`Book Room ${room.roomNumber}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button form="pay-form" className="btn btn-primary" disabled={loading || !quote || blocked}>
            {loading ? "Processing..." : quote ? `Pay ${money(quote.totalAmount)}` : "Pay"}
          </button>
        </>
      }
    >
      {!quote && !error ? <Loading text="Calculating price..." /> : null}
      {quote && (
        <div className="mb-3">
          <p className="mb-1"><strong>{room.type}</strong> · {fmtDate(dates.from)} to {fmtDate(dates.to)} ({quote.totalDays} night{quote.totalDays > 1 ? "s" : ""})</p>
          {quote.nights.some((n) => n.rule) && (
            <p className="small text-warning-emphasis mb-1">Seasonal pricing applies: {[...new Set(quote.nights.filter((n) => n.rule).map((n) => n.rule))].join(", ")}</p>
          )}
          <div className="small">Subtotal {money(quote.subtotal)} · Tax ({quote.taxRate}%) {money(quote.tax)}</div>
          <div className="fw-bold fs-5">Total: {money(quote.totalAmount)}</div>
          {blocked && <div className="alert alert-warning py-2 mt-2 mb-0">This room is no longer available for these dates.</div>}
        </div>
      )}
      <ErrorNote error={error} />
      <form id="pay-form" onSubmit={pay}>
        <div className="mb-2">
          <label className="form-label">Card holder name</label>
          <input className="form-control" name="cardHolderName" autoComplete="cc-name" value={card.cardHolderName} onChange={onChange} />
        </div>
        <div className="mb-2">
          <label className="form-label">Card number</label>
          <input className="form-control" name="cardNumber" inputMode="numeric" autoComplete="cc-number" value={card.cardNumber} onChange={onChange} />
        </div>
        <div className="row">
          <div className="col-6">
            <label className="form-label">Expiry (MM/YY)</label>
            <input className="form-control" name="expMonthYear" placeholder="MM/YY" autoComplete="cc-exp" value={card.expMonthYear} onChange={onChange} />
          </div>
          <div className="col-6">
            <label className="form-label">CVV</label>
            <input className="form-control" type="password" name="cvv" inputMode="numeric" autoComplete="cc-csc" value={card.cvv} onChange={onChange} />
          </div>
        </div>
        <p className="small text-muted mt-3 mb-0">
          Demo payment: the card is validated but only the last 4 digits are kept. Connect Stripe or Razorpay for real charges.
        </p>
      </form>
    </Modal>
  );
}
