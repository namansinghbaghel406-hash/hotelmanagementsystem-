// Seasonal pricing, hotels and room categories.
import { useState } from "react";
import { Loading, ErrorNote, Empty, Modal } from "../common/Misc";
import api, { errMsg } from "../../api";
import { useFetch } from "../../hooks";
import { fmtDate, toInputDate } from "../../format";
import { useToast } from "../../toast";

function useCrud(url) {
  const toast = useToast();
  const list = useFetch(url);
  const save = async (id, body, okText) => {
    try {
      if (id) await api.put(`${url}/${id}`, body);
      else await api.post(url, body);
      toast.success(okText);
      list.reload(true);
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    }
  };
  const remove = async (id, name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await api.delete(`${url}/${id}`);
      toast.success("Deleted");
      list.reload(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return { ...list, save, remove };
}

// ---------------------------------------------------------------- Seasonal pricing
export function SeasonalPricing() {
  const { data, loading, error, save, remove } = useCrud("/seasonal");
  const [editing, setEditing] = useState(null);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">Seasonal pricing</h5>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({})}>Add rule</button>
      </div>
      <p className="small text-muted">Each night in the date range is charged at the base rent adjusted by the percentage. Use a negative number for a discount. Newer rules win when ranges overlap.</p>
      <ErrorNote error={error} />
      {loading && !data ? <Loading /> : data?.length === 0 ? <Empty>No seasonal rules yet.</Empty> : (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead className="table-dark"><tr><th>Name</th><th>From</th><th>To</th><th>Adjustment</th><th>Room type</th><th>Active</th><th /></tr></thead>
            <tbody>
              {data?.map((r) => (
                <tr key={r._id}>
                  <td>{r.name}</td><td>{fmtDate(r.startDate)}</td><td>{fmtDate(r.endDate)}</td>
                  <td className={r.adjustmentPercent >= 0 ? "text-danger" : "text-success"}>{r.adjustmentPercent > 0 ? "+" : ""}{r.adjustmentPercent}%</td>
                  <td>{r.roomType}</td>
                  <td>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" checked={r.active} onChange={(e) => save(r._id, { active: e.target.checked }, "Rule updated")} aria-label="Active" />
                    </div>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(r)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => remove(r._id, r.name)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <SeasonalForm rule={editing} onClose={() => setEditing(null)} onSave={async (body) => (await save(editing._id, body, "Rule saved")) && setEditing(null)} />}
    </>
  );
}

function SeasonalForm({ rule, onClose, onSave }) {
  const [f, setF] = useState({
    name: rule.name || "",
    startDate: toInputDate(rule.startDate),
    endDate: toInputDate(rule.endDate),
    adjustmentPercent: rule.adjustmentPercent ?? 20,
    roomType: rule.roomType || "All",
  });
  const [err, setErr] = useState("");
  const set = (k, v) => setF({ ...f, [k]: v });

  const submit = () => {
    setErr("");
    if (!f.name || !f.startDate || !f.endDate) return setErr("Name and both dates are required");
    if (f.endDate < f.startDate) return setErr("End date cannot be before start date");
    onSave({ ...f, adjustmentPercent: Number(f.adjustmentPercent) });
  };

  return (
    <Modal title={rule._id ? "Edit rule" : "New seasonal rule"} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={submit}>Save</button></>}>
      <ErrorNote error={err} />
      <div className="mb-2"><label className="form-label">Name</label><input className="form-control" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
      <div className="row g-2 mb-2">
        <div className="col-6"><label className="form-label">From</label><input type="date" className="form-control" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
        <div className="col-6"><label className="form-label">To (inclusive)</label><input type="date" className="form-control" value={f.endDate} onChange={(e) => set("endDate", e.target.value)} /></div>
      </div>
      <div className="row g-2">
        <div className="col-6"><label className="form-label">Adjustment %</label><input type="number" className="form-control" value={f.adjustmentPercent} onChange={(e) => set("adjustmentPercent", e.target.value)} /></div>
        <div className="col-6">
          <label className="form-label">Applies to</label>
          <select className="form-select" value={f.roomType} onChange={(e) => set("roomType", e.target.value)}><option>All</option><option>Delux</option><option>Non-Delux</option></select>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Hotels and categories
function SimpleCatalog({ title, url, fields, columns }) {
  const { data, loading, error, save, remove } = useCrud(url);
  const [editing, setEditing] = useState(null);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">{title}</h5>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({})}>Add</button>
      </div>
      <ErrorNote error={error} />
      {loading && !data ? <Loading /> : data?.length === 0 ? <Empty>Nothing yet.</Empty> : (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead className="table-dark"><tr>{columns.map(([, h]) => <th key={h}>{h}</th>)}<th /></tr></thead>
            <tbody>
              {data?.map((row) => (
                <tr key={row._id}>
                  {columns.map(([k]) => <td key={k}>{Array.isArray(row[k]) ? row[k].join(", ") : row[k]}</td>)}
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(row)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => remove(row._id, row.name)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <SimpleForm title={editing._id ? `Edit ${title.toLowerCase()}` : `New ${title.toLowerCase()}`} row={editing} fields={fields} onClose={() => setEditing(null)} onSave={async (body) => (await save(editing._id, body, "Saved")) && setEditing(null)} />}
    </>
  );
}

function SimpleForm({ title, row, fields, onClose, onSave }) {
  const [f, setF] = useState(() => Object.fromEntries(fields.map(([k, , list]) => [k, list ? (row[k] || []).join(", ") : row[k] || ""])));
  const [err, setErr] = useState("");

  const submit = () => {
    setErr("");
    if (!f.name?.trim()) return setErr("Name is required");
    onSave(Object.fromEntries(fields.map(([k, , list]) => [k, list ? f[k].split(",").map((s) => s.trim()).filter(Boolean) : f[k]])));
  };

  return (
    <Modal title={title} onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={submit}>Save</button></>}>
      <ErrorNote error={err} />
      {fields.map(([k, text, list]) => (
        <div className="mb-2" key={k}>
          <label className="form-label">{text}{list ? " (comma separated)" : ""}</label>
          <input className="form-control" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        </div>
      ))}
    </Modal>
  );
}

export const HotelsAdmin = () => (
  <SimpleCatalog
    title="Hotels" url="/hotels"
    fields={[["name", "Name"], ["address", "Address"], ["city", "City"], ["phone", "Phone"], ["email", "Email"], ["description", "Description"], ["amenities", "Amenities", true]]}
    columns={[["name", "Name"], ["city", "City"], ["phone", "Phone"], ["amenities", "Amenities"]]}
  />
);

export const CategoriesAdmin = () => (
  <SimpleCatalog
    title="Room categories" url="/categories"
    fields={[["name", "Name"], ["description", "Description"], ["amenities", "Amenities", true]]}
    columns={[["name", "Name"], ["description", "Description"], ["amenities", "Amenities"]]}
  />
);
