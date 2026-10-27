import { useState } from "react";
import Navbar from "../common/Navbar";
import StatusBadge from "../common/StatusBadge";
import { Loading, ErrorNote, Empty } from "../common/Misc";
import api, { errMsg } from "../../api";
import { useFetch } from "../../hooks";
import { fmtDateTime, label } from "../../format";
import { useToast } from "../../toast";

const TYPES = ["room_service", "laundry", "housekeeping", "maintenance", "other"];

export default function Services() {
  const toast = useToast();
  const { data: bookings } = useFetch("/bookings/mine", { limit: 50 });
  const { data: requests, loading, error, reload } = useFetch("/services/mine");
  const [form, setForm] = useState({ booking: "", type: "room_service", description: "" });
  const [err, setErr] = useState("");

  const active = (bookings?.items || []).filter((b) => ["booked", "checked_in"].includes(b.status));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.booking || !form.description.trim()) return setErr("Choose a booking and describe what you need");
    try {
      await api.post("/services", form);
      toast.success("Request sent to our team");
      setForm({ ...form, description: "" });
      reload(true);
    } catch (e2) {
      setErr(errMsg(e2));
    }
  };

  return (
    <>
      <Navbar />
      <div className="container py-4">
        <h3 className="mb-3">Guest services</h3>
        <div className="row g-4">
          <div className="col-lg-5">
            <form className="card shadow-sm" onSubmit={submit}>
              <div className="card-body">
                <h5>New request</h5>
                <ErrorNote error={err} />
                {active.length === 0 && <div className="alert alert-info py-2">You need an active booking to request a service.</div>}
                <div className="mb-3">
                  <label className="form-label">Booking</label>
                  <select className="form-select" value={form.booking} onChange={(e) => setForm({ ...form, booking: e.target.value })}>
                    <option value="">Select a booking</option>
                    {active.map((b) => <option key={b._id} value={b._id}>Room {b.room?.roomNumber} · {new Date(b.fromDate).toISOString().slice(0, 10)}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Details</label>
                  <textarea className="form-control" rows="3" maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <button className="btn btn-primary" disabled={active.length === 0}>Send request</button>
              </div>
            </form>
          </div>
          <div className="col-lg-7">
            <h5>My requests</h5>
            <ErrorNote error={error} />
            {loading && !requests ? <Loading /> : requests?.length === 0 ? <Empty>No requests yet.</Empty> : (
              <div className="list-group shadow-sm">
                {requests?.map((r) => (
                  <div className="list-group-item" key={r._id}>
                    <div className="d-flex justify-content-between">
                      <strong>{label(r.type)} · Room {r.room?.roomNumber}</strong>
                      <StatusBadge value={r.status} />
                    </div>
                    <div className="small">{r.description}</div>
                    {r.response && <div className="small text-success">Reply: {r.response}</div>}
                    <div className="small text-muted">{fmtDateTime(r.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
