import { useState } from "react";
import { Loading, ErrorNote } from "./Misc";
import StatusBadge from "./StatusBadge";
import api, { errMsg } from "../../api";
import { useFetch } from "../../hooks";
import { fmtDateTime } from "../../format";

// One support conversation. Shared by guests and staff.
export default function TicketThread({ id, onChanged }) {
  const { data: t, loading, error, reload } = useFetch(`/support/${id}`);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setErr("");
    try {
      await api.post(`/support/${id}/reply`, { text });
      setText("");
      reload(true);
      onChanged && onChanged();
    } catch (e2) {
      setErr(errMsg(e2));
    }
  };
  const close = async () => {
    try {
      await api.put(`/support/${id}/close`);
      reload(true);
      onChanged && onChanged();
    } catch (e2) {
      setErr(errMsg(e2));
    }
  };

  if (loading && !t) return <Loading />;
  if (error) return <ErrorNote error={error} />;
  if (!t) return null;

  return (
    <div className="card shadow-sm">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div>
          <strong>{t.subject}</strong> <StatusBadge value={t.status} />
          <div className="small text-muted">{t.user?.name} · {t.user?.email}</div>
        </div>
        {t.status === "open" && <button className="btn btn-outline-secondary btn-sm" onClick={close}>Close ticket</button>}
      </div>
      <div className="card-body" style={{ maxHeight: 360, overflowY: "auto" }}>
        {t.messages.map((m, i) => (
          <div key={i} className={`mb-3 ${m.role === "Ordinary" ? "" : "text-end"}`}>
            <div className={`d-inline-block rounded p-2 text-start ${m.role === "Ordinary" ? "bg-body-secondary" : "bg-primary text-white"}`} style={{ maxWidth: "85%" }}>
              <div className="small fw-semibold">{m.senderName} {m.role !== "Ordinary" && `(${m.role})`}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
              <div className="small opacity-75">{fmtDateTime(m.at)}</div>
            </div>
          </div>
        ))}
      </div>
      {t.status === "open" && (
        <form className="card-footer" onSubmit={send}>
          <ErrorNote error={err} />
          <div className="input-group">
            <input className="form-control" placeholder="Write a message..." value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} />
            <button className="btn btn-primary">Send</button>
          </div>
        </form>
      )}
    </div>
  );
}
