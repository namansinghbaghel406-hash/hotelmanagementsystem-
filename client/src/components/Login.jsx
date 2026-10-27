import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./common/Navbar";
import { ErrorNote } from "./common/Misc";
import api, { errMsg } from "../api";
import { saveSession, homeFor } from "../auth";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) return setError("Email and password are required");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      saveSession(data.token, data.user);
      navigate(homeFor(data.user));
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container py-5" style={{ maxWidth: 440 }}>
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h3 className="mb-3">Login</h3>
            <ErrorNote error={error} />
            <form onSubmit={submit}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" name="email" autoComplete="username" value={form.email} onChange={onChange} />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" name="password" autoComplete="current-password" value={form.password} onChange={onChange} />
              </div>
              <button className="btn btn-primary w-100" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
            </form>
            <p className="mt-3 mb-0 small">
              Don't have an account? <Link to="/signup">Register</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
