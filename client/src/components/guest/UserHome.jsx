import { useState } from "react";
import Navbar from "../common/Navbar";
import RoomCard from "../common/RoomCard";
import Pagination from "../common/Pagination";
import BookingModal from "./BookingModal";
import { Loading, ErrorNote, Empty } from "../common/Misc";
import { useFetch, clean } from "../../hooks";
import { todayStr } from "../../format";
import { useToast } from "../../toast";

const EMPTY = { from: "", to: "", type: "", category: "", hotel: "", capacity: "", minPrice: "", maxPrice: "", sort: "" };

export default function UserHome() {
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const hasDates = f.from && f.to;
  const { data, loading, error, reload } = useFetch("/rooms", clean({ ...f, page, limit: 9 }));
  const { data: categories } = useFetch("/categories");
  const { data: hotels } = useFetch("/hotels");

  const set = (name, value) => {
    setPage(1);
    setF((prev) => {
      const next = { ...prev, [name]: value };
      // keep check-out after check-in
      if (next.from && next.to && next.to <= next.from) next.to = "";
      return next;
    });
  };
  const input = (name) => ({ value: f[name], onChange: (e) => set(name, e.target.value) });

  return (
    <>
      <Navbar />
      <div className="container py-4">
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-6 col-md-3">
                <label className="form-label">Check-in</label>
                <input type="date" className="form-control" min={todayStr()} {...input("from")} />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">Check-out</label>
                <input type="date" className="form-control" min={f.from || todayStr()} {...input("to")} />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">Room type</label>
                <select className="form-select" {...input("type")}>
                  <option value="">All</option><option value="Delux">Delux</option><option value="Non-Delux">Non-Delux</option>
                </select>
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">Category</label>
                <select className="form-select" {...input("category")}>
                  <option value="">All</option>
                  {(categories || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">Hotel</label>
                <select className="form-select" {...input("hotel")}>
                  <option value="">All</option>
                  {(hotels || []).map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label">Guests</label>
                <input type="number" min="1" className="form-control" placeholder="Any" {...input("capacity")} />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label">Min ₹</label>
                <input type="number" min="0" className="form-control" {...input("minPrice")} />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label">Max ₹</label>
                <input type="number" min="0" className="form-control" {...input("maxPrice")} />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">Sort by</label>
                <select className="form-select" {...input("sort")}>
                  <option value="">Room number</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                  <option value="rating">Top rated</option>
                </select>
              </div>
            </div>
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="small text-muted">
                {hasDates ? "Showing only rooms free on your dates." : "Pick check-in and check-out dates to see availability and book."}
              </span>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => { setF(EMPTY); setPage(1); }}>Clear filters</button>
            </div>
          </div>
        </div>

        <ErrorNote error={error} />
        {loading && !data ? <Loading text="Loading rooms..." /> : data?.rooms.length === 0 ? <Empty>No rooms match these filters.</Empty> : (
          <>
            <p className="text-muted small">{data?.total} room(s) found</p>
            <div className="row g-4">
              {data?.rooms.map((r) => (
                <div className="col-md-6 col-lg-4" key={r._id}>
                  <RoomCard
                    room={r}
                    action={
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={!hasDates || r.status === "maintenance"}
                        title={!hasDates ? "Choose dates first" : ""}
                        onClick={() => setSelected(r)}
                      >
                        {r.status === "maintenance" ? "Unavailable" : "Book now"}
                      </button>
                    }
                  />
                </div>
              ))}
            </div>
          </>
        )}
        <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
      </div>

      {selected && (
        <BookingModal
          room={selected}
          dates={{ from: f.from, to: f.to }}
          onClose={() => setSelected(null)}
          onBooked={(msg) => { setSelected(null); toast.success(msg); reload(true); }}
        />
      )}
    </>
  );
}
