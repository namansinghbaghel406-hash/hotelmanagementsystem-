import { Navigate } from "react-router-dom";
import { getUser, homeFor } from "../../auth";

// roles: optional list of allowed userType values. No list = any logged-in user.
export default function ProtectedRoute({ roles, children }) {
  const user = getUser();
  const token = localStorage.getItem("token");
  if (!user || !token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.userType)) return <Navigate to={homeFor(user)} replace />;
  return children;
}
