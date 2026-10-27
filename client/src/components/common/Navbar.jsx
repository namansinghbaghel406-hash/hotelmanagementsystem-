import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { getUser, clearSession, homeFor } from "../../auth";
import { applyTheme, getTheme } from "../../theme";
import api from "../../api";

export default function Navbar() {
  const user = getUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [theme, setTheme] = useState(getTheme());

  // Poll for new notifications every 30 seconds.
  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    const check = () =>
      api
        .get("/notifications/unread-count")
        .then((r) => alive && setUnread(r.data.unread))
        .catch(() => {});
    check();
    const t = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user && user._id]);

  const logout = () => {
    clearSession();
    navigate("/");
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  const link = (to, text) => (
    <li className="nav-item">
      <NavLink className="nav-link" to={to} end onClick={() => setOpen(false)}>
        {text}
      </NavLink>
    </li>
  );

  return (
    <nav className="navbar navbar-expand-lg navbar-dark brand-nav no-print">
      <div className="container">
        <Link className="navbar-brand fw-bold" to={homeFor(user)}>
          HotelPro
        </Link>
        <button className="navbar-toggler" type="button" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`collapse navbar-collapse ${open ? "show" : ""}`}>
          <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-1">
            {!user && (
              <>
                {link("/", "Home")}
                {link("/login", "Login")}
                {link("/signup", "SignUp")}
              </>
            )}
            {user?.userType === "Ordinary" && (
              <>
                {link("/user", "Rooms")}
                {link("/user/bookings", "My Bookings")}
                {link("/services", "Services")}
                {link("/support", "Support")}
              </>
            )}
            {user && user.userType !== "Ordinary" && link(homeFor(user), "Dashboard")}
            {user && (
              <>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/notifications" onClick={() => setOpen(false)}>
                    Alerts {unread > 0 && <span className="badge rounded-pill bg-danger">{unread}</span>}
                  </NavLink>
                </li>
                {link("/profile", user.name)}
              </>
            )}
            <li className="nav-item">
              <button className="btn btn-sm btn-outline-light ms-lg-2" onClick={toggleTheme} aria-label="Toggle dark mode">
                {theme === "dark" ? "Light" : "Dark"}
              </button>
            </li>
            {user && (
              <li className="nav-item">
                <button className="btn btn-sm btn-light ms-lg-2" onClick={logout}>Logout</button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
