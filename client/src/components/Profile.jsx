import { useState } from "react";
import Navbar from "./common/Navbar";
import { ErrorNote } from "./common/Misc";
import api, { errMsg } from "../api";
import { getUser, updateStoredUser } from "../auth";
import { useToast } from "../toast";

export default function Profile() {
  const toast = useToast();
  const [user, setUser] = useState(getUser());
  const [form, setForm] = useState({ name: user.name, phone: user.phone });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [err1, setErr1] = useState("");
  const [err2, setErr2] = useState("");

  const saveProfile = async (e) => {
    e.preventDefault();
    setErr1("");
    try {
      const { data } = await api.put("/auth/profile", form);
      updateStoredUser(data.user);
      setUser(data.user);
      toast.success("Profile updated");
    } catch (e2) {
      setErr1(errMsg(e2));
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setErr2("");
    if (pw.newPassword.length < 6) return setErr2("New password must be at least 6 characters");
    if (pw.newPassword !== pw.confirm) return setErr2("New passwords do not match");
    try {
      await api.put("/auth/password", { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password changed");
    } catch (e2) {
      setErr2(errMsg(e2));
    }
  };

  return (
    <>
      <Navbar />
      <div className="container py-4" style={{ maxWidth: 720 }}>
        <h3 className="mb-3">My profile</h3>
        <div className="card shadow-sm mb-4">
          <form className="card-body" onSubmit={saveProfile}>
            <ErrorNote error={err1} />
            <div className="mb-2 small text-muted">
              {user.email} · {user.userType === "Ordinary" ? "Guest" : user.userType}
              {user.department ? ` · ${user.department}` : ""} · {user.emailVerified ? "Email verified" : "Email not verified"}
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Name</label>
                <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary mt-3">Save changes</button>
          </form>
        </div>

        <div className="card shadow-sm">
          <form className="card-body" onSubmit={savePassword}>
            <h5>Change password</h5>
            <ErrorNote error={err2} />
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Current</label>
                <input className="form-control" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label">New</label>
                <input className="form-control" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Confirm new</label>
                <input className="form-control" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-outline-primary mt-3">Update password</button>
          </form>
        </div>
      </div>
    </>
  );
}
