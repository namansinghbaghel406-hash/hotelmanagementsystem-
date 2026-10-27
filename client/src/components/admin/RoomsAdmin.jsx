import { useState } from "react";
import Pagination from "../common/Pagination";
import StatusBadge from "../common/StatusBadge";
import { Loading, ErrorNote, Empty, Modal } from "../common/Misc";
import api, { errMsg, assetUrl } from "../../api";
import { useFetch } from "../../hooks";
import { money } from "../../format";
import { useToast } from "../../toast";

const BLANK = { roomNumber: "", maxCount: "", rentPerDay: "", type: "Delux", hotel: "", category: "", description: "", amenities: "", photos: [] };

export default function RoomsAdmin() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | "new" | room
  const { data, loading, error, reload } = useFetch("/rooms", { page, limit: 8 });

  const remove = async (r) => {
    if (!window.confirm(`Delete room ${r.roomNumber}?`)) return;
    try {
      await api.delete(`/rooms/${r._id}`);
      toast.success("Room deleted");
      reload(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Room inventory & pricing</h5>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing("new")}>Add room</button>
      </div>
      <ErrorNote error={error} />
      {loading && !data ? <Loading /> : data?.rooms.length === 0 ? <Empty>No rooms yet.</Empty> : (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead className="table-dark"><tr><th /><th>Room</th><th>Hotel / category</th><th>Capacity</th><th>Rent / night</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data?.rooms.map((r) => (
                <tr key={r._id}>
                  <td><img className="thumb" src={assetUrl(r.photos?.[0])} alt="" loading="lazy" /></td>
                  <td>{r.roomNumber} <span className="badge bg-info text-dark">{r.type}</span></td>
                  <td className="small">{[r.hotel?.name, r.category?.name].filter(Boolean).join(" · ") || "-"}</td>
                  <td>{r.maxCount}</td>
                  <td>{money(r.rentPerDay)}</td>
                  <td><StatusBadge value={r.status} /></td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(r)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => remove(r)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
      {data && <p className="text-muted small mt-2">Total rooms: {data.total}</p>}
      {editing && <RoomForm room={editing === "new" ? null : editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(true); }} />}
    </>
  );
}

function RoomForm({ room, onClose, onDone }) {
  const toast = useToast();
  const { data: hotels } = useFetch("/hotels");
  const { data: categories } = useFetch("/categories");
  const [f, setF] = useState(
    room
      ? { ...BLANK, ...room, hotel: room.hotel?._id || "", category: room.category?._id || "", amenities: (room.amenities || []).join(", "), photos: room.photos || [] }
      : BLANK
  );
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF({ ...f, [k]: v });

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const body = new FormData();
    files.forEach((file) => body.append("images", file));
    setUploading(true);
    try {
      const { data } = await api.post("/rooms/upload", body);
      setF((prev) => ({ ...prev, photos: [...prev.photos, ...data.urls] }));
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const save = async () => {
    setErr("");
    if (!f.roomNumber || !f.maxCount || f.rentPerDay === "" || !f.description) return setErr("Room number, capacity, rent and description are required");
    const payload = {
      roomNumber: Number(f.roomNumber),
      maxCount: Number(f.maxCount),
      rentPerDay: Number(f.rentPerDay),
      type: f.type,
      hotel: f.hotel,
      category: f.category,
      description: f.description,
      amenities: f.amenities.split(",").map((a) => a.trim()).filter(Boolean),
      photos: f.photos,
    };
    setSaving(true);
    try {
      if (room) await api.put(`/rooms/${room._id}`, payload);
      else await api.post("/rooms", payload);
      toast.success(room ? "Room updated" : "Room added");
      onDone();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={room ? `Edit room ${room.roomNumber}` : "Add a room"} size="modal-lg" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button></>}>
      <ErrorNote error={err} />
      <div className="row g-3">
        <div className="col-md-4"><label className="form-label">Room number</label><input type="number" className="form-control" value={f.roomNumber} onChange={(e) => set("roomNumber", e.target.value)} /></div>
        <div className="col-md-4"><label className="form-label">Max guests</label><input type="number" min="1" className="form-control" value={f.maxCount} onChange={(e) => set("maxCount", e.target.value)} /></div>
        <div className="col-md-4"><label className="form-label">Rent / night (₹)</label><input type="number" min="0" className="form-control" value={f.rentPerDay} onChange={(e) => set("rentPerDay", e.target.value)} /></div>
        <div className="col-md-4">
          <label className="form-label">Type</label>
          <select className="form-select" value={f.type} onChange={(e) => set("type", e.target.value)}><option>Delux</option><option>Non-Delux</option></select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Hotel</label>
          <select className="form-select" value={f.hotel} onChange={(e) => set("hotel", e.target.value)}>
            <option value="">None</option>{(hotels || []).map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Category</label>
          <select className="form-select" value={f.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">None</option>{(categories || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div className="col-12"><label className="form-label">Description</label><textarea className="form-control" rows="2" value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
        <div className="col-12"><label className="form-label">Amenities (comma separated)</label><input className="form-control" value={f.amenities} onChange={(e) => set("amenities", e.target.value)} /></div>
        <div className="col-12">
          <label className="form-label">Photos</label>
          <div className="d-flex gap-2 flex-wrap mb-2">
            {f.photos.map((p, i) => (
              <div key={`${p}-${i}`} className="position-relative">
                <img className="thumb" src={assetUrl(p)} alt="" />
                <button type="button" className="btn btn-sm btn-danger position-absolute top-0 end-0 py-0 px-1" onClick={() => set("photos", f.photos.filter((_, j) => j !== i))} aria-label="Remove photo">×</button>
              </div>
            ))}
          </div>
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="form-control mb-2" onChange={upload} disabled={uploading} />
          <div className="input-group">
            <input className="form-control" placeholder="...or paste an image URL" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button type="button" className="btn btn-outline-secondary" onClick={() => { if (url.trim()) { set("photos", [...f.photos, url.trim()]); setUrl(""); } }}>Add URL</button>
          </div>
          {uploading && <div className="small text-muted mt-1">Uploading...</div>}
        </div>
      </div>
    </Modal>
  );
}
