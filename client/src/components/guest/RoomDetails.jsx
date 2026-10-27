import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../common/Navbar";
import Pagination from "../common/Pagination";
import StatusBadge from "../common/StatusBadge";
import { Loading, ErrorNote, Empty, Stars } from "../common/Misc";
import { useFetch } from "../../hooks";
import { assetUrl } from "../../api";
import { money, fmtDate } from "../../format";
import { getUser } from "../../auth";

export default function RoomDetails() {
  const { id } = useParams();
  const user = getUser();
  const [page, setPage] = useState(1);
  const [photo, setPhoto] = useState(0);
  const { data: room, loading, error } = useFetch(`/rooms/${id}`);
  const { data: reviews } = useFetch("/reviews", { room: id, page, limit: 5 });

  return (
    <>
      <Navbar />
      <div className="container py-4">
        <Link to={user ? "/user" : "/"} className="btn btn-outline-secondary btn-sm mb-3">Back</Link>
        <ErrorNote error={error} />
        {loading ? <Loading /> : room && (
          <div className="row g-4">
            <div className="col-lg-7">
              <img src={assetUrl(room.photos?.[photo])} alt={`Room ${room.roomNumber}`} className="img-fluid rounded shadow-sm w-100" style={{ maxHeight: 420, objectFit: "cover" }} />
              {room.photos?.length > 1 && (
                <div className="d-flex gap-2 mt-2 flex-wrap">
                  {room.photos.map((p, i) => (
                    <img key={p} src={assetUrl(p)} alt="" className={`thumb ${i === photo ? "border border-primary border-2" : ""}`} style={{ cursor: "pointer" }} onClick={() => setPhoto(i)} loading="lazy" />
                  ))}
                </div>
              )}
            </div>
            <div className="col-lg-5">
              <h3>Room {room.roomNumber} <span className="badge bg-secondary">{room.type}</span></h3>
              <p className="text-muted mb-1">{[room.hotel?.name, room.hotel?.city, room.category?.name].filter(Boolean).join(" · ")}</p>
              <p><Stars value={room.avgRating} count={room.reviewCount} /></p>
              <p className="fs-4 fw-semibold mb-1">{money(room.rentPerDay)} <small className="text-muted fs-6">/ night</small></p>
              <p className="mb-2">Up to {room.maxCount} guests <StatusBadge value={room.status} /></p>
              <p>{room.description}</p>
              {room.amenities?.length > 0 && (
                <p>{room.amenities.map((a) => <span key={a} className="badge text-bg-light border me-1">{a}</span>)}</p>
              )}
              {user?.userType === "Ordinary" ? (
                <Link to="/user" className="btn btn-primary">Pick dates and book</Link>
              ) : !user ? (
                <Link to="/login" className="btn btn-primary">Login to book</Link>
              ) : null}
            </div>

            <div className="col-12">
              <h5>Guest reviews</h5>
              {!reviews ? <Loading /> : reviews.items.length === 0 ? <Empty>No reviews yet.</Empty> : (
                <div className="list-group">
                  {reviews.items.map((r) => (
                    <div key={r._id} className="list-group-item">
                      <div className="d-flex justify-content-between">
                        <strong>{r.user?.name || "Guest"}</strong>
                        <small className="text-muted">{fmtDate(r.createdAt)}</small>
                      </div>
                      <Stars value={r.rating} />
                      {r.comment && <p className="mb-0 mt-1">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
              <Pagination page={reviews?.page || 1} pages={reviews?.pages} onChange={setPage} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
