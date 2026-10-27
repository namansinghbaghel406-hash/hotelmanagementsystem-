import { useState } from "react";
import Navbar from "../common/Navbar";
import { Tabs } from "../common/Misc";
import Dashboard from "./Dashboard";
import RoomsAdmin from "./RoomsAdmin";
import UsersAdmin from "./UsersAdmin";
import { SeasonalPricing, HotelsAdmin, CategoriesAdmin } from "./CatalogAdmin";
import { PaymentsAdmin, ReviewsAdmin } from "./FinanceAdmin";
import { LogsAdmin, SecurityAdmin, BroadcastAdmin, SettingsAdmin } from "./SystemAdmin";
import { BookingsPanel, RoomStatusPanel, HousekeepingPanel, ServicesPanel, SupportPanel } from "../staff/panels";

// Top-level sections, each with its own sub-tabs, so the page stays easy to scan.
const SECTIONS = {
  dashboard: ["Dashboard", [["main", "Reports & analytics", Dashboard]]],
  bookings: ["Bookings", [["all", "All bookings", BookingsPanel], ["payments", "Payments", PaymentsAdmin]]],
  hotel: [
    "Hotel management",
    [
      ["rooms", "Rooms & pricing", RoomsAdmin],
      ["seasonal", "Seasonal pricing", SeasonalPricing],
      ["hotels", "Hotels", HotelsAdmin],
      ["categories", "Categories", CategoriesAdmin],
      ["status", "Room status / occupancy", RoomStatusPanel],
    ],
  ],
  ops: [
    "Operations",
    [["housekeeping", "Housekeeping", HousekeepingPanel], ["services", "Service requests", ServicesPanel], ["support", "Customer support", SupportPanel], ["reviews", "Reviews", ReviewsAdmin]],
  ],
  people: ["Users & staff", [["users", "User management", UsersAdmin], ["broadcast", "Announcements", BroadcastAdmin]]],
  system: ["System", [["security", "Security", SecurityAdmin], ["logs", "Audit logs", LogsAdmin], ["settings", "Configuration", SettingsAdmin]]],
};

export default function AdminHome() {
  const [section, setSection] = useState("dashboard");
  const [sub, setSub] = useState({});

  const [, subs] = SECTIONS[section];
  const activeKey = sub[section] || subs[0][0];
  const Active = (subs.find(([k]) => k === activeKey) || subs[0])[2];

  return (
    <>
      <Navbar />
      <div className="container py-4">
        <h3 className="mb-3">Admin dashboard</h3>
        <Tabs tabs={Object.entries(SECTIONS).map(([k, [text]]) => [k, text])} active={section} onChange={setSection} />
        {subs.length > 1 && (
          <ul className="nav nav-underline mb-3 tab-scroll">
            {subs.map(([k, text]) => (
              <li className="nav-item" key={k}>
                <button className={`nav-link ${activeKey === k ? "active" : ""}`} onClick={() => setSub({ ...sub, [section]: k })}>{text}</button>
              </li>
            ))}
          </ul>
        )}
        <Active key={`${section}-${activeKey}`} />
      </div>
    </>
  );
}
