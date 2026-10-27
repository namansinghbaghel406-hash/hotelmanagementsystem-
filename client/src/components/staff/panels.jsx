// Operational panels used by the staff dashboard and (re-used) by the admin dashboard.
import { useState } from "react";
import Pagination from "../common/Pagination";
import StatusBadge from "../common/StatusBadge";
import TicketThread from "../common/TicketThread";
import { Loading, ErrorNote, Empty, Modal } from "../common/Misc";
import api, { errMsg } from "../../api";
import { useFetch, clean } from "../../hooks";
import { money, fmtDate, fmtDateTime, toInputDate, label } from "../../format";
import { useToast } from "../../toast";

// Runs an API action, then toasts the result or the error.
function useAction(toast, reload) {
  return async (fn, okText) => {
    try {
      const res = await fn();
      toast.success(okText || res?.data?.msg || "Done");
      reload(true);
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    }
  };
}

// ---------------------------------------------------------------- Bookings
export function BookingsPanel() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: "", refund: "", q: "" });
  const [modify, setModify] = useState(null);
  const [refund, setRefund] = useState(null);
  const { data, loading, error, reload } = useFetch("/bookings", clean({ ...filters, page, limit: 8 }));
  const run = useAction(toast, reload);

  const set = (k, v) => { setPage(1); setFilters({ ...filters, [k]: v }); };

  return (
    <>
      <div className="row g-2 mb-3">
        <div className="col-md-4"><input className="form-control" placeholder="Search guest name" value={filters.q} onChange={(e) => set("q", e.target.value)} /></div>
        <div className="col-6 col-md-3">
          <select className="form-select" value={filters.status} onChange={(e) => set("status", e.target.value)}>
            <option value="">All statuses</option>
            {["pending", "booked", "checked_in", "checked_out", "cancelled"].map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-3">
          <select className="form-select" value={filters.refund} onChange={(e) => set("refund", e.target.value)}>
            <option value="">Any refund state</option>
            <option value="requested">Refund requested</option>
            <option value="approved">Refund approved</option>
            <option value="rejected">Refund rejected</option>
          </select>
        </div>
      </div>
      <ErrorNote error={error} />
      {loading && !data ? <Loading /> : (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead className="table-dark">
              <tr><th>Guest</th><th>Room</th><th>Stay</th><th>Total</th><th>Status</th><th>Refund</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data?.items.map((b) => (
                <tr key={b._id}>
                  <td>{b.user?.name || b.guestName}<div className="small text-muted">{b.phone}</div></td>
                  <td>{b.room?.roomNumber} <small className="text-muted">({b.roomType})</small></td>
                  <td className="small">{fmtDate(b.fromDate)}<br />{fmtDate(b.toDate)}</td>
                  <td>{money(b.totalAmount)}</td>
                  <td><StatusBadge value={b.status} /></td>
                  <td><StatusBadge value={b.refund?.status} /></td>
                  <td>
                    <div className="d-flex gap-1 flex-wrap">
                      {b.status === "pending" && <button className="btn btn-sm btn-success" onClick={() => run(() => api.post(`/bookings/${b._id}/approve`))}>Approve</button>}
                      {b.status === "booked" && <button className="btn btn-sm btn-primary" onClick={() => run(() => api.post(`/bookings/${b._id}/checkin`))}>Check in</button>}
                      {b.status === "checked_in" && <button className="btn btn-sm btn-warning" onClick={() => run(() => api.post(`/bookings/${b._id}/checkout`))}>Check out</button>}
                      {["pending", "booked"].includes(b.status) && (
                        <>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => setModify(b)}>Modify</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => window.confirm("Cancel this booking?") && run(() => api.post(`/bookings/${b._id}/cancel`, { reason: "Cancelled by staff" }))}>Cancel</button>
                        </>
                      )}
                      {b.refund?.status === "requested" && <button className="btn btn-sm btn-outline-warning" onClick={() => setRefund(b)}>Review refund</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan="7"><Empty>No bookings found.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
      {data && <p className="text-muted small mt-2">Total: {data.total}</p>}

      {modify && <ModifyModal booking={modify} onClose={() => setModify(null)} onDone={() => { setModify(null); reload(true); }} />}
      {refund && <RefundModal booking={refund} onClose={() => setRefund(null)} onDone={() => { setRefund(null); reload(true); }} />}
    </>
  );
}

function ModifyModal({ booking, onClose, onDone }) {
  const toast = useToast();
  const [from, setFrom] = useState(toInputDate(booking.fromDate));
  const [to, setTo] = useState(toInputDate(booking.toDate));
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    try {
      await api.put(`/bookings/${booking._id}/modify`, { fromDate: from, toDate: to });
      toast.success("Booking updated and re-priced");
      onDone();
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  return (
    <Modal title={`Modify booking: ${booking.user?.name || booking.guestName}`} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={save}>Save changes</button></>}>
      <ErrorNote error={err} />
      <p className="small text-muted">Room {booking.room?.roomNumber}. The total is recalculated with current seasonal rates and tax.</p>
      <div className="row g-3">
        <div className="col-6"><label className="form-label">Check-in</label><input type="date" className="form-control" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="col-6"><label className="form-label">Check-out</label><input type="date" className="form-control" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
    </Modal>
  );
}

function RefundModal({ booking, onClose, onDone }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const decide = async (action) => {
    setErr("");
    try {
      await api.put(`/bookings/${booking._id}/refund`, { action, note });
      toast.success(`Refund ${action}d`);
      onDone();
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  return (
    <Modal title="Refund request" onClose={onClose}
      footer={<><button className="btn btn-outline-danger" onClick={() => decide("reject")}>Reject</button><button className="btn btn-success" onClick={() => decide("approve")}>Approve {money(booking.refund.amount)}</button></>}>
      <ErrorNote error={err} />
      <p className="mb-1"><strong>{booking.user?.name || booking.guestName}</strong>, room {booking.room?.roomNumber}</p>
      <p className="small text-muted mb-2">Requested {fmtDateTime(booking.refund.requestedAt)}. Reason: {booking.refund.reason || "none given"}</p>
      <label className="form-label">Note to guest (optional)</label>
      <input className="form-control" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
    </Modal>
  );
}

// ---------------------------------------------------------------- Room status
export function RoomStatusPanel() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { data, loading, error, reload } = useFetch("/rooms", clean({ status, page, limit: 12 }));
  const run = useAction(toast, reload);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h5 className="mb-0">Room status</h5>
        <select className="form-select w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All rooms</option>
          {["available", "occupied", "cleaning", "maintenance"].map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
      </div>
      <ErrorNote error={error} />
      {loading && !data ? <Loading /> : (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead className="table-dark"><tr><th>Room</th><th>Type</th><th>Capacity</th><th>Status</th><th>Change status</th></tr></thead>
            <tbody>
              {data?.rooms.map((r) => (
                <tr key={r._id}>
                  <td>{r.roomNumber}</td><td>{r.type}</td><td>{r.maxCount}</td>
                  <td><StatusBadge value={r.status} /></td>
                  <td>
                    <select className="form-select form-select-sm w-auto" value={r.status}
                      onChange={(e) => run(() => api.put(`/rooms/${r._id}/status`, { status: e.target.value }), `Room ${r.roomNumber} is now ${e.target.value}`)}>
                      {["available", "occupied", "cleaning", "maintenance"].map((s) => <option key={s} value={s}>{label(s)}</option>)}
                    </select>
                  </td>
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

// ---------------------------------------------------------------- Housekeeping
export function HousekeepingPanel() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [mine, setMine] = useState(false);
  const [adding, setAdding] = useState(false);
  const { data, loading, error, reload } = useFetch("/housekeeping", clean({ status, mine: mine ? "true" : "", page, limit: 10 }));
  const { data: staff } = useFetch("/users/staff");
  const run = useAction(toast, reload);

  return (
    <>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <select className="form-select w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All tasks</option><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="done">Done</option>
        </select>
        <div className="form-check mb-0">
          <input id="mine" className="form-check-input" type="checkbox" checked={mine} onChange={(e) => { setMine(e.target.checked); setPage(1); }} />
          <label htmlFor="mine" className="form-check-label">Assigned to me</label>
        </div>
        <button className="btn btn-primary btn-sm ms-auto" onClick={() => setAdding(true)}>New task</button>
      </div>
      <ErrorNote error={error} />
      {loading && !data ? <Loading /> : (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead className="table-dark"><tr><th>Room</th><th>Notes</th><th>Priority</th><th>Assigned to</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data?.items.map((t) => (
                <tr key={t._id}>
                  <td>{t.room?.roomNumber}</td>
                  <td className="small">{t.notes}</td>
                  <td><StatusBadge value={t.priority} /></td>
                  <td>
                    <select className="form-select form-select-sm w-auto" value={t.assignedTo?._id || ""}
                      onChange={(e) => run(() => api.put(`/housekeeping/${t._id}`, { assignedTo: e.target.value }), "Task assigned")}>
                      <option value="">Unassigned</option>
                      {(staff || []).map((s) => <option key={s._id} value={s._id}>{s.name}{s.department ? ` (${s.department})` : ""}</option>)}
                    </select>
                  </td>
                  <td><StatusBadge value={t.status} /></td>
                  <td>
                    <div className="d-flex gap-1">
                      {t.status === "pending" && <button className="btn btn-sm btn-outline-primary" onClick={() => run(() => api.put(`/housekeeping/${t._id}`, { status: "in_progress" }), "Task started")}>Start</button>}
                      {t.status !== "done" && <button className="btn btn-sm btn-success" onClick={() => run(() => api.put(`/housekeeping/${t._id}`, { status: "done" }), "Done. Room released if it was being cleaned.")}>Done</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan="6"><Empty>No housekeeping tasks.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
      {adding && <NewTaskModal staff={staff || []} onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload(true); }} />}
    </>
  );
}

function NewTaskModal({ staff, onClose, onDone }) {
  const toast = useToast();
  const { data: rooms } = useFetch("/rooms", { limit: 200 });
  const [f, setF] = useState({ room: "", assignedTo: "", priority: "normal", notes: "" });
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    try {
      await api.post("/housekeeping", clean(f));
      toast.success("Task created");
      onDone();
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  return (
    <Modal title="New housekeeping task" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={save}>Create</button></>}>
      <ErrorNote error={err} />
      <label className="form-label">Room</label>
      <select className="form-select mb-2" value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })}>
        <option value="">Select room</option>
        {(rooms?.rooms || []).map((r) => <option key={r._id} value={r._id}>{r.roomNumber}</option>)}
      </select>
      <label className="form-label">Assign to</label>
      <select className="form-select mb-2" value={f.assignedTo} onChange={(e) => setF({ ...f, assignedTo: e.target.value })}>
        <option value="">Unassigned</option>
        {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
      </select>
      <label className="form-label">Priority</label>
      <select className="form-select mb-2" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
        <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
      </select>
      <label className="form-label">Notes</label>
      <textarea className="form-control" rows="2" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
    </Modal>
  );
}

// ---------------------------------------------------------------- Service requests
export function ServicesPanel() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [replyFor, setReplyFor] = useState(null);
  const [reply, setReply] = useState("");
  const { data, loading, error, reload } = useFetch("/services", clean({ status, page, limit: 10 }));
  const run = useAction(toast, reload);

  const sendReply = async () => {
    const ok = await run(() => api.put(`/services/${replyFor._id}`, { response: reply, status: "resolved" }), "Resolved and guest notified");
    if (ok) { setReplyFor(null); setReply(""); }
  };

  return (
    <>
      <select className="form-select w-auto mb-3" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">All requests</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option>
      </select>
      <ErrorNote error={error} />
      {loading && !data ? <Loading /> : data?.items.length === 0 ? <Empty>No service requests.</Empty> : (
        <div className="list-group shadow-sm">
          {data?.items.map((r) => (
            <div key={r._id} className="list-group-item">
              <div className="d-flex justify-content-between flex-wrap gap-2">
                <div>
                  <strong>{label(r.type)}</strong> · Room {r.room?.roomNumber} · {r.user?.name} <span className="text-muted small">{r.user?.phone}</span>
                  <div>{r.description}</div>
                  {r.response && <div className="small text-success">Reply: {r.response}</div>}
                  <div className="small text-muted">{fmtDateTime(r.createdAt)}</div>
                </div>
                <div className="text-end">
                  <StatusBadge value={r.status} />
                  {r.status !== "resolved" && (
                    <div className="d-flex gap-1 mt-2">
                      {r.status === "open" && <button className="btn btn-sm btn-outline-primary" onClick={() => run(() => api.put(`/services/${r._id}`, { status: "in_progress" }), "Marked in progress")}>Start</button>}
                      <button className="btn btn-sm btn-success" onClick={() => { setReplyFor(r); setReply(""); }}>Resolve</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />

      {replyFor && (
        <Modal title="Resolve request" onClose={() => setReplyFor(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setReplyFor(null)}>Close</button><button className="btn btn-success" onClick={sendReply}>Mark resolved</button></>}>
          <p className="small text-muted">{replyFor.description}</p>
          <label className="form-label">Message to guest (optional)</label>
          <input className="form-control" maxLength={500} value={reply} onChange={(e) => setReply(e.target.value)} />
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Support
export function SupportPanel() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("open");
  const [active, setActive] = useState(null);
  const { data, loading, error, reload } = useFetch("/support", clean({ status, page, limit: 8 }));

  return (
    <div className="row g-4">
      <div className="col-lg-5">
        <select className="form-select w-auto mb-3" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="open">Open</option><option value="closed">Closed</option><option value="">All</option>
        </select>
        <ErrorNote error={error} />
        {loading && !data ? <Loading /> : data?.items.length === 0 ? <Empty>No tickets.</Empty> : (
          <div className="list-group shadow-sm">
            {data?.items.map((t) => (
              <button key={t._id} className={`list-group-item list-group-item-action ${active === t._id ? "active" : ""}`} onClick={() => setActive(t._id)}>
                <div className="d-flex justify-content-between"><strong>{t.subject}</strong><StatusBadge value={t.status} /></div>
                <small>{t.user?.name} · {fmtDateTime(t.updatedAt)}</small>
              </button>
            ))}
          </div>
        )}
        <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
      </div>
      <div className="col-lg-7">
        {active ? <TicketThread key={active} id={active} onChanged={() => reload(true)} /> : <Empty>Select a ticket to reply.</Empty>}
      </div>
    </div>
  );
}
