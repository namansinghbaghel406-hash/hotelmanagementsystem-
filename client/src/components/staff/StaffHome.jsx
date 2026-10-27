import { useState } from "react";
import Navbar from "../common/Navbar";
import BarChart from "../common/BarChart";
import { Tabs, StatCard, Loading, ErrorNote } from "../common/Misc";
import { BookingsPanel, RoomStatusPanel, HousekeepingPanel, ServicesPanel, SupportPanel } from "./panels";
import { useFetch } from "../../hooks";

const TABS = [
  ["overview", "Overview"],
  ["bookings", "Reservations & check-in/out"],
  ["rooms", "Room status"],
  ["housekeeping", "Housekeeping"],
  ["services", "Service requests"],
  ["support", "Customer support"],
];

export function Overview() {
  const { data: s, loading, error } = useFetch("/reports/summary");
  const { data: occ } = useFetch("/reports/occupancy", { days: 14 });

  if (loading) return <Loading />;
  return (
    <>
      <ErrorNote error={error} />
      {s && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3"><StatCard title="Arrivals today" value={s.arrivalsToday} /></div>
          <div className="col-6 col-md-3"><StatCard title="Departures today" value={s.departuresToday} tone="warning" /></div>
          <div className="col-6 col-md-3"><StatCard title="Occupancy now" value={`${s.occupancyRate}%`} sub={`${s.occupiedRooms} of ${s.totalRooms} rooms`} tone="success" /></div>
          <div className="col-6 col-md-3"><StatCard title="Pending approvals" value={s.pendingApprovals} tone="danger" /></div>
          <div className="col-6 col-md-3"><StatCard title="Refund requests" value={s.pendingRefunds} tone="danger" /></div>
          <div className="col-6 col-md-3"><StatCard title="Open service requests" value={s.openServiceRequests} tone="warning" /></div>
          <div className="col-6 col-md-3"><StatCard title="Open tickets" value={s.openTickets} /></div>
          <div className="col-6 col-md-3"><StatCard title="Cleaning tasks left" value={s.pendingHousekeeping} /></div>
        </div>
      )}
      {occ && (
        <div className="card shadow-sm">
          <div className="card-body">
            <h6>Occupancy forecast, next 14 days (% of rooms)</h6>
            <BarChart title="Occupancy forecast" data={occ.days.map((d) => ({ label: d.date.slice(5), value: d.rate }))} format={(v) => `${v}%`} />
          </div>
        </div>
      )}
    </>
  );
}

export default function StaffHome() {
  const [tab, setTab] = useState("overview");
  return (
    <>
      <Navbar />
      <div className="container py-4">
        <h3 className="mb-3">Staff dashboard</h3>
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        {tab === "overview" && <Overview />}
        {tab === "bookings" && <BookingsPanel />}
        {tab === "rooms" && <RoomStatusPanel />}
        {tab === "housekeeping" && <HousekeepingPanel />}
        {tab === "services" && <ServicesPanel />}
        {tab === "support" && <SupportPanel />}
      </div>
    </>
  );
}
