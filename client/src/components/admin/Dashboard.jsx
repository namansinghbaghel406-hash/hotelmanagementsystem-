import BarChart from "../common/BarChart";
import { Loading, ErrorNote, StatCard } from "../common/Misc";
import { useFetch } from "../../hooks";
import { money } from "../../format";

export default function Dashboard() {
  const { data: s, loading, error } = useFetch("/reports/summary");
  const { data: rev } = useFetch("/reports/revenue", { months: 6 });
  const { data: occ } = useFetch("/reports/occupancy", { days: 14 });
  const { data: top } = useFetch("/reports/top-rooms");
  const { data: sec } = useFetch("/admin/security");

  if (loading) return <Loading />;
  const by = s?.bookingsByStatus || {};

  return (
    <>
      <ErrorNote error={error} />
      {s && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3"><StatCard title="Net revenue" value={money(s.revenue.net)} sub={`${money(s.revenue.refunded)} refunded`} tone="success" /></div>
          <div className="col-6 col-md-3"><StatCard title="Occupancy now" value={`${s.occupancyRate}%`} sub={`${s.occupiedRooms} of ${s.totalRooms} rooms`} /></div>
          <div className="col-6 col-md-3"><StatCard title="Active bookings" value={(by.booked || 0) + (by.checked_in || 0) + (by.pending || 0)} sub={`${by.cancelled || 0} cancelled`} /></div>
          <div className="col-6 col-md-3"><StatCard title="Users" value={s.users} /></div>
          <div className="col-6 col-md-3"><StatCard title="Pending approvals" value={s.pendingApprovals} tone="danger" /></div>
          <div className="col-6 col-md-3"><StatCard title="Refund requests" value={s.pendingRefunds} tone="danger" /></div>
          <div className="col-6 col-md-3"><StatCard title="Failed logins (24h)" value={sec?.failedLogins24h ?? "-"} tone="warning" /></div>
          <div className="col-6 col-md-3"><StatCard title="Server errors (24h)" value={sec?.errors24h ?? "-"} tone="warning" /></div>
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card shadow-sm h-100"><div className="card-body">
            <h6>Net revenue, last 6 months</h6>
            {rev && <BarChart title="Monthly revenue" data={rev.map((m) => ({ label: m.month.slice(2), value: m.revenue }))} format={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v)} />}
          </div></div>
        </div>
        <div className="col-lg-6">
          <div className="card shadow-sm h-100"><div className="card-body">
            <h6>Occupancy forecast, next 14 days (%)</h6>
            {occ && <BarChart title="Occupancy forecast" data={occ.days.map((d) => ({ label: d.date.slice(5), value: d.rate }))} format={(v) => `${v}%`} />}
          </div></div>
        </div>
        <div className="col-lg-7">
          <div className="card shadow-sm"><div className="card-body">
            <h6>Top rooms by revenue</h6>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead><tr><th>Room</th><th>Type</th><th>Bookings</th><th className="text-end">Revenue</th></tr></thead>
                <tbody>
                  {(top || []).map((r) => <tr key={r.roomNumber}><td>{r.roomNumber}</td><td>{r.type}</td><td>{r.bookings}</td><td className="text-end">{money(r.revenue)}</td></tr>)}
                  {top?.length === 0 && <tr><td colSpan="4" className="text-muted text-center">No bookings yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div></div>
        </div>
        <div className="col-lg-5">
          <div className="card shadow-sm"><div className="card-body">
            <h6>System health</h6>
            {sec ? (
              <ul className="list-unstyled small mb-0">
                <li>Database: <strong>{sec.system.dbState}</strong></li>
                <li>Uptime: {Math.floor(sec.system.uptimeSeconds / 60)} min</li>
                <li>Memory: {sec.system.memoryMB} MB</li>
                <li>Node: {sec.system.node}</li>
                <li>Logins (24h): {sec.logins24h}</li>
              </ul>
            ) : <Loading />}
          </div></div>
        </div>
      </div>
    </>
  );
}
