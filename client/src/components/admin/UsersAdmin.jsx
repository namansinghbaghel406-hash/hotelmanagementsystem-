import { useState } from "react";
import Pagination from "../common/Pagination";
import { Loading, ErrorNote, Empty, Modal } from "../common/Misc";
import api, { errMsg } from "../../api";
import { useFetch, clean } from "../../hooks";
import { fmtDate } from "../../format";
import { getUser } from "../../auth";
import { useToast } from "../../toast";

const ROLE_LABEL = { Ordinary: "Guest", Staff: "Staff", Admin: "Admin" };
const ROLE_COLOR = { Ordinary: "primary", Staff: "info text-dark", Admin: "success" };

export default function UsersAdmin() {
  const toast = useToast();
  const me = getUser();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ q: "", role: "" });
  const [editing, setEditing] = useState(null);
  const { data, loading, error, reload } = useFetch("/users", clean({ ...filters, page, limit: 10 }));

  const set = (k, v) => { setPage(1); setFilters({ ...filters, [k]: v }); };

  const toggle = async (u) => {
    try {
      await api.put(`/users/${u._id}`, { isActive: !u.isActive });
      toast.success(u.isActive ? "Account disabled" : "Account enabled");
      reload(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u._id}`);
      toast.success("User deleted");
      reload(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <>
      <div className="row g-2 mb-3">
        <div className="col-md-5"><input className="form-control" placeholder="Search name, email or phone" value={filters.q} onChange={(e) => set("q", e.target.value)} /></div>
        <div className="col-6 col-md-3">
          <select className="form-select" value={filters.role} onChange={(e) => set("role", e.target.value)}>
            <option value="">All roles</option><option value="Ordinary">Guests</option><option value="Staff">Staff</option><option value="Admin">Admins</option>
          </select>
        </div>
        <div className="col-6 col-md-4 text-md-end"><button className="btn btn-primary" onClick={() => setEditing({})}>Add user / staff</button></div>
      </div>
      <ErrorNote error={error} />
      {loading && !data ? <Loading /> : data?.items.length === 0 ? <Empty>No users found.</Empty> : (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead className="table-dark"><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data?.items.map((u) => (
                <tr key={u._id} className={u.isActive ? "" : "opacity-50"}>
                  <td>{u.name}{u.department && <div className="small text-muted">{u.department}</div>}</td>
                  <td>{u.email}{!u.emailVerified && <div className="small text-warning-emphasis">unverified</div>}</td>
                  <td>{u.phone}</td>
                  <td><span className={`badge bg-${ROLE_COLOR[u.userType]}`}>{ROLE_LABEL[u.userType]}</span></td>
                  <td>{fmtDate(u.createdAt)}</td>
                  <td>{u.isActive ? "Active" : "Disabled"}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(u)}>Edit</button>
                      {u._id !== me._id && (
                        <>
                          <button className="btn btn-sm btn-outline-warning" onClick={() => toggle(u)}>{u.isActive ? "Disable" : "Enable"}</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => remove(u)}>Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
      {data && <p className="text-muted small mt-2">Total users: {data.total}</p>}
      {editing && <UserForm user={editing} isSelf={editing._id === me._id} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(true); }} />}
    </>
  );
}

function UserForm({ user, isSelf, onClose, onDone }) {
  const toast = useToast();
  const isNew = !user._id;
  const [f, setF] = useState({ name: user.name || "", email: user.email || "", phone: user.phone || "", password: "", userType: user.userType || "Staff", department: user.department || "" });
  const [err, setErr] = useState("");
  const set = (k, v) => setF({ ...f, [k]: v });

  const save = async () => {
    setErr("");
    if (!f.name || !f.phone || (isNew && (!f.email || f.password.length < 6))) return setErr("Fill all fields (password needs at least 6 characters)");
    try {
      if (isNew) await api.post("/users", f);
      else await api.put(`/users/${user._id}`, { name: f.name, phone: f.phone, userType: f.userType, department: f.department });
      toast.success(isNew ? "User created" : "User updated");
      onDone();
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  return (
    <Modal title={isNew ? "Add user" : `Edit ${user.name}`} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
      <ErrorNote error={err} />
      <div className="mb-2"><label className="form-label">Name</label><input className="form-control" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
      {isNew && (
        <>
          <div className="mb-2"><label className="form-label">Email</label><input type="email" className="form-control" value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
          <div className="mb-2"><label className="form-label">Password</label><input type="password" className="form-control" autoComplete="new-password" value={f.password} onChange={(e) => set("password", e.target.value)} /></div>
        </>
      )}
      <div className="mb-2"><label className="form-label">Phone</label><input className="form-control" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
      <div className="row g-2">
        <div className="col-6">
          <label className="form-label">Role</label>
          <select className="form-select" value={f.userType} disabled={isSelf} onChange={(e) => set("userType", e.target.value)}>
            <option value="Ordinary">Guest</option><option value="Staff">Staff</option><option value="Admin">Admin</option>
          </select>
        </div>
        <div className="col-6"><label className="form-label">Department</label><input className="form-control" placeholder="e.g. Front desk" value={f.department} onChange={(e) => set("department", e.target.value)} /></div>
      </div>
    </Modal>
  );
}
