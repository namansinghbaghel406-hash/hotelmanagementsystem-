import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./common/Navbar";
import Pagination from "./common/Pagination";
import { Loading, ErrorNote, Empty } from "./common/Misc";
import api from "../api";
import { useFetch } from "../hooks";
import { fmtDateTime } from "../format";

export default function Notifications() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch("/notifications", { page, limit: 10 });
  const navigate = useNavigate();

  const open = async (n) => {
    if (!n.read) await api.put(`/notifications/${n._id}/read`).catch(() => {});
    if (n.link) navigate(n.link);
    else reload(true);
  };
  const readAll = async () => {
    await api.put("/notifications/read-all");
    reload(true);
  };
  const remove = async (id) => {
    await api.delete(`/notifications/${id}`);
    reload(true);
  };

  return (
    <>
      <Navbar />
      <div className="container py-4" style={{ maxWidth: 760 }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0">Notifications {data?.unread > 0 && <span className="badge bg-danger">{data.unread} new</span>}</h3>
          <button className="btn btn-outline-secondary btn-sm" onClick={readAll}>Mark all read</button>
        </div>
        <ErrorNote error={error} />
        {loading && !data ? <Loading /> : data?.items.length === 0 ? <Empty>No notifications yet.</Empty> : (
          <div className="list-group shadow-sm">
            {data?.items.map((n) => (
              <div key={n._id} className={`list-group-item d-flex justify-content-between align-items-start ${n.read ? "" : "list-group-item-primary"}`}>
                <button className="btn btn-link text-start text-decoration-none text-reset p-0 flex-grow-1" onClick={() => open(n)}>
                  <div className="fw-semibold">{n.title}</div>
                  <div className="small">{n.message}</div>
                  <div className="small text-muted">{fmtDateTime(n.createdAt)}</div>
                </button>
                <button className="btn btn-sm btn-outline-secondary ms-2" onClick={() => remove(n._id)} aria-label="Delete notification">×</button>
              </div>
            ))}
          </div>
        )}
        <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
      </div>
    </>
  );
}
