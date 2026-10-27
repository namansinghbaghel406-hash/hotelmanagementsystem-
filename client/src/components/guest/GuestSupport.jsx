import { useState } from "react";
import Navbar from "../common/Navbar";
import Pagination from "../common/Pagination";
import TicketThread from "../common/TicketThread";
import StatusBadge from "../common/StatusBadge";
import { Loading, ErrorNote, Empty } from "../common/Misc";
import api, { errMsg } from "../../api";
import { useFetch } from "../../hooks";
import { fmtDateTime } from "../../format";
import { useToast } from "../../toast";

export default function GuestSupport() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ subject: "", text: "" });
  const [err, setErr] = useState("");
  const { data, loading, error, reload } = useFetch("/support", { page, limit: 8 });

  const create = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.subject.trim() || !form.text.trim()) return setErr("Subject and message are required");
    try {
      const { data: t } = await api.post("/support", form);
      toast.success("Ticket opened. We will reply soon.");
      setForm({ subject: "", text: "" });
      setActive(t._id);
      reload(true);
    } catch (e2) {
      setErr(errMsg(e2));
    }
  };

  return (
    <>
      <Navbar />
      <div className="container py-4">
        <h3 className="mb-3">Customer support</h3>
        <div className="row g-4">
          <div className="col-lg-5">
            <form className="card shadow-sm mb-4" onSubmit={create}>
              <div className="card-body">
                <h5>Contact us</h5>
                <ErrorNote error={err} />
                <input className="form-control mb-2" placeholder="Subject" maxLength={150} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                <textarea className="form-control mb-2" rows="3" placeholder="How can we help?" maxLength={2000} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
                <button className="btn btn-primary">Open ticket</button>
              </div>
            </form>
            <h5>My tickets</h5>
            <ErrorNote error={error} />
            {loading && !data ? <Loading /> : data?.items.length === 0 ? <Empty>No tickets yet.</Empty> : (
              <div className="list-group shadow-sm">
                {data?.items.map((t) => (
                  <button key={t._id} className={`list-group-item list-group-item-action ${active === t._id ? "active" : ""}`} onClick={() => setActive(t._id)}>
                    <div className="d-flex justify-content-between"><strong>{t.subject}</strong><StatusBadge value={t.status} /></div>
                    <small>{fmtDateTime(t.updatedAt)}</small>
                  </button>
                ))}
              </div>
            )}
            <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
          </div>
          <div className="col-lg-7">
            {active ? <TicketThread key={active} id={active} onChanged={() => reload(true)} /> : <Empty>Select a ticket to see the conversation.</Empty>}
          </div>
        </div>
      </div>
    </>
  );
}
