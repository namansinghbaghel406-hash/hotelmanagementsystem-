import { Link } from "react-router-dom";
import Navbar from "./common/Navbar";
import RoomCard from "./common/RoomCard";
import { Loading, Empty } from "./common/Misc";
import { useFetch } from "../hooks";
import { getUser, homeFor } from "../auth";

export default function Home() {
  const user = getUser();
  const { data, loading } = useFetch("/rooms", { limit: 3, sort: "rating" });
  const { data: settings } = useFetch("/settings/public");
  const rooms = data?.rooms || [];

  return (
    <>
      <Navbar />
      <header className="hero text-center">
        <div className="container">
          <h1 className="display-4 fw-bold">Welcome to {settings?.siteName || "HotelPro"}</h1>
          <p className="lead">Find and book your perfect stay in a few clicks.</p>
          {user ? (
            <Link to={homeFor(user)} className="btn btn-light btn-lg">Go to my dashboard</Link>
          ) : (
            <>
              <Link to="/signup" className="btn btn-light btn-lg me-2">Get started</Link>
              <Link to="/login" className="btn btn-outline-light btn-lg">Login</Link>
            </>
          )}
        </div>
      </header>

      <section className="container py-5">
        <div className="row g-4 text-center">
          {[
            ["Real-time availability", "Rooms disappear the moment they are booked, so what you see is what you get."],
            ["Transparent pricing", "Seasonal rates and taxes are shown before you pay, and again on your invoice."],
            ["Easy changes", "Cancel from your account and track refunds, or message our front desk any time."],
          ].map(([t, d]) => (
            <div className="col-md-4" key={t}>
              <h5>{t}</h5>
              <p className="text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container pb-5">
        <h2 className="mb-3">Top rated rooms</h2>
        {loading ? <Loading /> : rooms.length === 0 ? <Empty>No rooms available yet.</Empty> : (
          <div className="row g-4">
            {rooms.map((r) => (
              <div className="col-md-4" key={r._id}>
                <RoomCard room={r} action={!user && <Link to="/login" className="btn btn-primary btn-sm">Login to book</Link>} />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
