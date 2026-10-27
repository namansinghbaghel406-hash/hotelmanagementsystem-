import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Navbar from "./components/common/Navbar";
import { Loading } from "./components/common/Misc";
import Home from "./components/Home";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import VerifyEmail from "./components/VerifyEmail";
import RoomDetails from "./components/guest/RoomDetails";

// Code splitting: each dashboard is only downloaded when it is opened.
const UserHome = lazy(() => import("./components/guest/UserHome"));
const BookingHistory = lazy(() => import("./components/guest/BookingHistory"));
const Services = lazy(() => import("./components/guest/Services"));
const GuestSupport = lazy(() => import("./components/guest/GuestSupport"));
const Profile = lazy(() => import("./components/Profile"));
const Notifications = lazy(() => import("./components/Notifications"));
const Invoice = lazy(() => import("./components/Invoice"));
const StaffHome = lazy(() => import("./components/staff/StaffHome"));
const AdminHome = lazy(() => import("./components/admin/AdminHome"));

const GUEST = ["Ordinary"];
const OPS = ["Staff", "Admin"];

const Fallback = () => (
  <>
    <Navbar />
    <Loading />
  </>
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify/:token" element={<VerifyEmail />} />
          <Route path="/rooms/:id" element={<RoomDetails />} />

          <Route path="/user" element={<ProtectedRoute roles={GUEST}><UserHome /></ProtectedRoute>} />
          <Route path="/user/bookings" element={<ProtectedRoute roles={GUEST}><BookingHistory /></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute roles={GUEST}><Services /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute roles={GUEST}><GuestSupport /></ProtectedRoute>} />

          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/invoice/:id" element={<ProtectedRoute><Invoice /></ProtectedRoute>} />

          <Route path="/staff" element={<ProtectedRoute roles={OPS}><StaffHome /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={["Admin"]}><AdminHome /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
