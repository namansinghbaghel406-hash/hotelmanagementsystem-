import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../common/Navbar";
import Pagination from "../common/Pagination";
import StatusBadge from "../common/StatusBadge";
import { Loading, ErrorNote, Empty, Modal } from "../common/Misc";
import api, { errMsg } from "../../api";
import { useFetch, clean } from "../../hooks";
import { money, fmtDate } from "../../format";
import { useToast } from "../../toast";

export default function BookingHistory() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [cancelFor, setCancelFor] = useState(null);
  const [reason, setReason] = useState("");
  const [reviewFor, setReviewFor] = useState(null);
  const [review, setReview] = useState({ rating: 5, comment: "" });
  const [modalError, setModalError] = useState("");
  const { data, loading, error, reload } = useFetch("/bookings/mine", clean({ page, limit: 6, status }));

  const doCancel = async () => {
    setModalError("");
    try {
      const { data: res } = await api.post(`/bookings/${cancelFor._id}/cancel`, { reason });
      toast.success(res.msg);
      setCancelFor(null);
      setReason("");
      reload(true);
    } catch (e) {
      setModalError(errMsg(e));
    }
  };

  const doReview = async () => {
    setModalError("");
    try {
      await api.post("/reviews", { booking: reviewFor._id, rating: Number(review.rating), comment: review.comment });
      toast.success("Thanks for your review!");
      setReviewFor(null);
      setReview({ rating: 5, comment: "" });
      reload(true);
    } catch (e) {
      setModalError(errMsg(e));
    }
  };

  return (
    <>
      <Navbar />
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h3 className="mb-0">My Bookings</h3>
          <select className="form-select w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="pending">Pending approval</option>
            <option value="booked">Booked</option>
            <option value="checked_in">Checked in</option>
            <option value="checked_out">Checked out</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <ErrorNote error={error} />
        {loading && !data ? <Loading /> : data?.items.length === 0 ? <Empty>You have no bookings yet. <Link to="/user">Find a room</Link></Empty> : (
          <div className="row g-3">
            {data?.items.map((b) => (
              <div className="col-md-6" key={b._id}>
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="card-title">
                      {b.roomType} Room #{b.room?.roomNumber} <StatusBadge value={b.status} />
                    </h5>
                    <p className="mb-1 small text-muted">ID: {b._id}</p>
                    <p className="mb-1 small"><strong>Stay:</strong> {fmtDate(b.fromDate)} to {fmtDate(b.toDate)} ({b.totalDays} nights)</p>
                    <p className="mb-1 small"><strong>Total:</strong> {money(b.totalAmount)} (incl. {money(b.tax)} tax)</p>
                    {b.refund?.status !== "none" && (
                      <p className="mb-1 small"><strong>Refund:</strong> <StatusBadge value={b.refund.status} /> {money(b.refund.amount)} {b.refund.note && `· ${b.refund.note}`}</p>
                    )}
                    <div className="d-flex gap-2 flex-wrap mt-2">
                      {b.status !== "pending" && <Link to={`/invoice/${b._id}`} className="btn btn-outline-primary btn-sm">Invoice</Link>}
                      {["pending", "booked"].includes(b.status) && (
                        <button className="btn btn-outline-danger btn-sm" onClick={() => { setModalError(""); setCancelFor(b); }}>Cancel</button>
                      )}
                      {["checked_in", "checked_out"].includes(b.status) && !b.reviewed && (
                        <button className="btn btn-outline-warning btn-sm" onClick={() => { setModalError(""); setReviewFor(b); }}>Leave a review</button>
                      )}
                      {b.reviewed && <span className="badge text-bg-light border align-self-center">Reviewed</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
        {data && <p className="text-muted small mt-3">Total bookings: {data.total}</p>}
      </div>

      {cancelFor && (
        <Modal
          title="Cancel this booking?"
          onClose={() => setCancelFor(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setCancelFor(null)}>Keep booking</button><button className="btn btn-danger" onClick={doCancel}>Cancel booking</button></>}
        >
          <ErrorNote error={modalError} />
          <p>Room {cancelFor.room?.roomNumber}, {fmtDate(cancelFor.fromDate)} to {fmtDate(cancelFor.toDate)}. A refund of {money(cancelFor.totalAmount)} will be requested and reviewed by our team.</p>
          <label className="form-label">Reason (optional)</label>
          <textarea className="form-control" rows="2" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Modal>
      )}

      {reviewFor && (
        <Modal
          title={`Review room ${reviewFor.room?.roomNumber}`}
          onClose={() => setReviewFor(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setReviewFor(null)}>Close</button><button className="btn btn-primary" onClick={doReview}>Submit review</button></>}
        >
          <ErrorNote error={modalError} />
          <label className="form-label">Rating</label>
          <select className="form-select mb-3" value={review.rating} onChange={(e) => setReview({ ...review, rating: e.target.value })}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}
          </select>
          <label className="form-label">Comment</label>
          <textarea className="form-control" rows="3" maxLength={1000} value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} />
        </Modal>
      )}
    </>
  );
}
