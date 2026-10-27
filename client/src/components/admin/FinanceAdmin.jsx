// Payment tracking and review moderation.
import { useState } from "react";
import Pagination from "../common/Pagination";
import StatusBadge from "../common/StatusBadge";
import { Loading, ErrorNote, Empty, StatCard, Stars } from "../common/Misc";
import api, { errMsg } from "../../api";
import { useFetch, clean } from "../../hooks";
import { money, fmtDateTime, fmtDate } from "../../format";
import { useToast } from "../../toast";

export function PaymentsAdmin() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { data, loading, error } = useFetch("/payments", clean({ status, page, limit: 10 }));

  return (
    <>
      {data && (
        <div className="row g-3 mb-3">
          <div className="col-6 col-md-3"><StatCard title="Collected" value={money(data.totals.collected)} tone="success" /></div>
          <div className="col-6 col-md-3"><StatCard title="Refunded" value={money(data.totals.refunded)} tone="danger" /></div>
          <div className="col-6 col-md-3"><StatCard title="Net" value={money(data.totals.net)} /></div>
          <div className="col-6 col-md-3"><StatCard title="Transactions" value={data.totals.count} tone="secondary" /></div>
        </div>
      )}
      <select className="form-select w-auto mb-3" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">All payments</option><option value="paid">Paid</option><option value="refunded">Refunded</option><option value="failed">Failed</option>
      </select>
      <ErrorNote error={error} />
      {loading && !data ? <Loading /> : data?.items.length === 0 ? <Empty>No payments yet.</Empty> : (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead className="table-dark"><tr><th>When</th><th>Guest</th><th>Transaction</th><th>Card</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {data?.items.map((p) => (
                <tr key={p._id}>
                  <td className="small">{fmtDateTime(p.createdAt)}</td>
                  <td>{p.user?.name}<div className="small text-muted">{p.user?.email}</div></td>
                  <td className="small">{p.transactionId}</td>
                  <td>•••• {p.cardLast4}</td>
                  <td>{money(p.amount)}{p.refundedAmount > 0 && <div className="small text-danger">-{money(p.refundedAmount)}</div>}</td>
                  <td><StatusBadge value={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
    </>
  );
}

export function ReviewsAdmin() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch("/reviews", { page, limit: 10 });

  const remove = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      await api.delete(`/reviews/${id}`);
      toast.success("Review deleted");
      reload(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <>
      <ErrorNote error={error} />
      {loading && !data ? <Loading /> : data?.items.length === 0 ? <Empty>No reviews yet.</Empty> : (
        <div className="list-group shadow-sm">
          {data?.items.map((r) => (
            <div key={r._id} className="list-group-item d-flex justify-content-between gap-3">
              <div>
                <strong>{r.user?.name}</strong> on room {r.room?.roomNumber} <Stars value={r.rating} /> <small className="text-muted">{fmtDate(r.createdAt)}</small>
                {r.comment && <div>{r.comment}</div>}
              </div>
              <button className="btn btn-sm btn-outline-danger align-self-start" onClick={() => remove(r._id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
      <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
    </>
  );
}
