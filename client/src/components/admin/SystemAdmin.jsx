// Audit logs, security monitoring, announcements and platform configuration.
import { useEffect, useState } from "react";
import Pagination from "../common/Pagination";
import { Loading, ErrorNote, Empty, StatCard } from "../common/Misc";
import api, { errMsg } from "../../api";
import { useFetch, clean } from "../../hooks";
import { fmtDateTime } from "../../format";
import { useToast } from "../../toast";

const LEVEL_COLOR = { info: "secondary", warn: "warning text-dark", error: "danger" };

export function LogsAdmin() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ level: "", q: "" });
  const { data, loading, error } = useFetch("/admin/logs", clean({ ...filters, page, limit: 15 }));
  const set = (k, v) => { setPage(1); setFilters({ ...filters, [k]: v }); };

  return (
    <>
      <div className="row g-2 mb-3">
        <div className="col-md-5"><input className="form-control" placeholder="Search user, action or details" value={filters.q} onChange={(e) => set("q", e.target.value)} /></div>
        <div className="col-6 col-md-3">
          <select className="form-select" value={filters.level} onChange={(e) => set("level", e.target.value)}>
            <option value="">All levels</option><option value="info">Info</option><option value="warn">Warnings</option><option value="error">Errors</option>
          </select>
        </div>
      </div>
      <ErrorNote error={error} />
      {loading && !data ? <Loading /> : data?.items.length === 0 ? <Empty>No log entries.</Empty> : (
        <div className="table-responsive">
          <table className="table table-sm table-striped align-middle">
            <thead className="table-dark"><tr><th>Time</th><th>Level</th><th>User</th><th>Action</th><th>Details</th><th>IP</th></tr></thead>
            <tbody>
              {data?.items.map((l) => (
                <tr key={l._id}>
                  <td className="small text-nowrap">{fmtDateTime(l.createdAt)}</td>
                  <td><span className={`badge bg-${LEVEL_COLOR[l.level]}`}>{l.level}</span></td>
                  <td className="small">{l.userName || "-"}{l.role && <span className="text-muted"> ({l.role})</span>}</td>
                  <td className="small">{l.action}</td>
                  <td className="small">{l.entity && `${l.entity} `}{l.details}</td>
                  <td className="small text-muted">{l.ip}</td>
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

export function SecurityAdmin() {
  const { data, loading, error } = useFetch("/admin/security");
  if (loading) return <Loading />;
  return (
    <>
      <ErrorNote error={error} />
      {data && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3"><StatCard title="Failed logins (24h)" value={data.failedLogins24h} tone={data.failedLogins24h > 10 ? "danger" : "warning"} /></div>
            <div className="col-6 col-md-3"><StatCard title="Successful logins (24h)" value={data.logins24h} tone="success" /></div>
            <div className="col-6 col-md-3"><StatCard title="Server errors (24h)" value={data.errors24h} tone={data.errors24h ? "danger" : "success"} /></div>
            <div className="col-6 col-md-3"><StatCard title="Disabled accounts" value={data.disabledUsers} tone="secondary" sub={`${data.privilegedUsers} staff/admin accounts`} /></div>
          </div>
          <h6>Most recent failed login attempts</h6>
          {data.recentFailed.length === 0 ? <Empty>None recorded.</Empty> : (
            <ul className="list-group mb-4">
              {data.recentFailed.map((l) => (
                <li className="list-group-item small d-flex justify-content-between" key={l._id}>
                  <span>{l.details}</span><span className="text-muted">{l.ip} · {fmtDateTime(l.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          <h6>System health</h6>
          <p className="small">Database {data.system.dbState} · uptime {Math.floor(data.system.uptimeSeconds / 60)} min · {data.system.memoryMB} MB · Node {data.system.node}</p>
        </>
      )}
    </>
  );
}

export function BroadcastAdmin() {
  const toast = useToast();
  const [f, setF] = useState({ audience: "all", title: "", message: "" });
  const [err, setErr] = useState("");

  const send = async (e) => {
    e.preventDefault();
    setErr("");
    if (!f.title.trim()) return setErr("A title is required");
    try {
      const { data } = await api.post("/notifications/broadcast", f);
      toast.success(data.msg);
      setF({ ...f, title: "", message: "" });
    } catch (e2) {
      setErr(errMsg(e2));
    }
  };

  return (
    <form className="card shadow-sm" style={{ maxWidth: 560 }} onSubmit={send}>
      <div className="card-body">
        <h5>Send an announcement</h5>
        <p className="small text-muted">Appears in the notification centre of every selected user.</p>
        <ErrorNote error={err} />
        <label className="form-label">Audience</label>
        <select className="form-select mb-2" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
          <option value="all">Everyone</option><option value="guests">Guests</option><option value="staff">Staff</option>
        </select>
        <label className="form-label">Title</label>
        <input className="form-control mb-2" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <label className="form-label">Message</label>
        <textarea className="form-control mb-3" rows="3" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
        <button className="btn btn-primary">Send</button>
      </div>
    </form>
  );
}

export function SettingsAdmin() {
  const toast = useToast();
  const { data, loading, error } = useFetch("/settings");
  const [f, setF] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => { if (data) setF(data); }, [data]);

  const save = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await api.put("/settings", { siteName: f.siteName, taxRate: Number(f.taxRate), requireApproval: f.requireApproval, checkInTime: f.checkInTime, checkOutTime: f.checkOutTime, currency: f.currency });
      toast.success("Settings saved");
    } catch (e2) {
      setErr(errMsg(e2));
    }
  };

  if (loading || !f) return <Loading />;
  return (
    <form className="card shadow-sm" style={{ maxWidth: 560 }} onSubmit={save}>
      <div className="card-body">
        <h5>Platform configuration</h5>
        <ErrorNote error={error || err} />
        <div className="mb-2"><label className="form-label">Site name</label><input className="form-control" value={f.siteName} onChange={(e) => setF({ ...f, siteName: e.target.value })} /></div>
        <div className="row g-2 mb-2">
          <div className="col-4"><label className="form-label">Tax rate (%)</label><input type="number" min="0" max="100" className="form-control" value={f.taxRate} onChange={(e) => setF({ ...f, taxRate: e.target.value })} /></div>
          <div className="col-4"><label className="form-label">Check-in time</label><input type="time" className="form-control" value={f.checkInTime} onChange={(e) => setF({ ...f, checkInTime: e.target.value })} /></div>
          <div className="col-4"><label className="form-label">Check-out time</label><input type="time" className="form-control" value={f.checkOutTime} onChange={(e) => setF({ ...f, checkOutTime: e.target.value })} /></div>
        </div>
        <div className="form-check form-switch mb-3">
          <input id="req" className="form-check-input" type="checkbox" checked={f.requireApproval} onChange={(e) => setF({ ...f, requireApproval: e.target.checked })} />
          <label htmlFor="req" className="form-check-label">Bookings need approval before they are confirmed</label>
        </div>
        <button className="btn btn-primary">Save settings</button>
      </div>
    </form>
  );
}
