import { Link } from "react-router-dom";
import { assetUrl } from "../../api";
import { money } from "../../format";
import { Stars } from "./Misc";
import StatusBadge from "./StatusBadge";

export default function RoomCard({ room, action, showStatus = false }) {
  return (
    <div className="card room-card h-100 shadow-sm">
      <img src={assetUrl(room.photos?.[0])} className="card-img-top" alt={`Room ${room.roomNumber}`} loading="lazy" />
      <div className="card-body d-flex flex-column">
        <h5 className="card-title">
          Room {room.roomNumber}{" "}
          <span className={`badge ${room.type === "Delux" ? "bg-warning text-dark" : "bg-secondary"}`}>{room.type}</span>{" "}
          {showStatus && <StatusBadge value={room.status} />}
        </h5>
        {(room.hotel?.name || room.category?.name) && (
          <p className="small text-muted mb-1">{[room.hotel?.name, room.category?.name].filter(Boolean).join(" · ")}</p>
        )}
        <p className="small mb-1">
          <Stars value={room.avgRating} count={room.reviewCount} />
        </p>
        <p className="small text-muted mb-1">Up to {room.maxCount} guests</p>
        <p className="fw-semibold mb-1">{money(room.rentPerDay)} / night</p>
        <p className="small flex-grow-1">{room.description}</p>
        <div className="d-flex gap-2 mt-2">
          <Link to={`/rooms/${room._id}`} className="btn btn-outline-secondary btn-sm">Details</Link>
          {action}
        </div>
      </div>
    </div>
  );
}
