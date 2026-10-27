import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./common/Navbar";
import { ErrorNote } from "./common/Misc";
import api, { errMsg } from "../api";
import { useFetch } from "../hooks";
import { useToast } from "../toast";

export default function SignUp() {
  const [form, setForm] = useState({ name: "", email: "", password: "", cpassword: "", phone: "", userType: "Ordinary" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { data: settings } = useFetch("/settings/public");

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const { name, email, password, cpassword, phone, userType } = form;
    if (!name || !email || !password || !cpassword || !phone) return setError("All fields are required");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== cpassword) return setError("Passwords do not match");
    if (!/^[+\d][\d\s-]{6,}$/.test(phone)) return setError("Enter a valid phone number");

    setLoading(true);
    try {
      await api.post("/auth/signup", { name, email, password, phone, userType });
      toast.success("Account created. Check your email for the verification link, then log in.");
      navigate("/login");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container py-5" style={{ maxWidth: 480 }}>
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h3 className="mb-3">Create an account</h3>
            <ErrorNote error={error} />
            <form onSubmit={submit}>
              <div className="mb-3">
                <label className="form-label">Full name</label>
                <input className="form-control" name="name" value={form.name} onChange={onChange} />
              </div>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" name="email" value={form.email} onChange={onChange} />
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Password</label>
                  <input className="form-control" type="password" name="password" autoComplete="new-password" value={form.password} onChange={onChange} />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Confirm password</label>
                  <input className="form-control" type="password" name="cpassword" autoComplete="new-password" value={form.cpassword} onChange={onChange} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Phone</label>
                <input className="form-control" name="phone" value={form.phone} onChange={onChange} />
              </div>
              {settings?.allowPrivilegedSignup && (
                <div className="mb-3">
                  <label className="form-label">User type</label>
                  <select className="form-select" name="userType" value={form.userType} onChange={onChange}>
                    <option value="Ordinary">Guest</option>
                    <option value="Staff">Staff</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <div className="form-text">Shown only because this server allows it (demo mode).</div>
                </div>
              )}
              <button className="btn btn-primary w-100" disabled={loading}>{loading ? "Creating..." : "Register"}</button>
            </form>
            <p className="mt-3 mb-0 small">
              Have an account? <Link to="/login">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
