
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  XCircle,
  Ban,
  ArrowRight,
  LoaderCircle,
  ClipboardList,
} from "lucide-react";
import api from "../services/api";
import "./TenantDashboard.css";

const filters = [
  "ALL",
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
];

const statusIcons = {
  PENDING: Clock3,
  ACCEPTED: CheckCircle2,
  REJECTED: XCircle,
  CANCELLED: Ban,
};

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRent(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "Rent not available";

  return `₹${amount.toLocaleString("en-IN")}/month`;
}

function TenantDashboard() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/bookings/my");
      const data = response.data;

      const list = Array.isArray(data)
        ? data
        : data.bookings || data.data || [];

      setBookings(Array.isArray(list) ? list : []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      setError(
        err.response?.data?.message ||
          "Unable to load your bookings. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!token) {
      navigate("/login");
      return;
    }

    if (user?.role === "OWNER") {
      navigate("/owner");
      return;
    }

    if (user?.role === "ADMIN") {
      navigate("/admin");
      return;
    }

    loadBookings();
  }, [navigate, loadBookings]);

  const handleCancel = async (bookingId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking request?"
    );

    if (!confirmed) return;

    setCancellingId(bookingId);
    setError("");
    setNotice("");

    try {
      await api.patch(`/bookings/${bookingId}/cancel`);

      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: "CANCELLED" }
            : booking
        )
      );

      setNotice("Your booking request has been cancelled.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not cancel this request. Please refresh and try again."
      );
    } finally {
      setCancellingId(null);
    }
  };

  const counts = {
    ALL: bookings.length,
    PENDING: bookings.filter((item) => item.status === "PENDING").length,
    ACCEPTED: bookings.filter((item) => item.status === "ACCEPTED").length,
    REJECTED: bookings.filter((item) => item.status === "REJECTED").length,
    CANCELLED: bookings.filter((item) => item.status === "CANCELLED").length,
  };

  const visibleBookings =
    activeFilter === "ALL"
      ? bookings
      : bookings.filter((item) => item.status === activeFilter);

  return (
    <div className="tenant-dashboard">
      <section className="tenant-hero">
        <div className="tenant-hero-content">
          <span className="tenant-eyebrow">TENANT SPACE</span>
          <h1>Your room bookings</h1>
          <p>
            Keep track of your booking requests and find your next place
            to call home.
          </p>

          <Link to="/rooms" className="tenant-browse-button">
            Explore rooms <ArrowRight size={18} />
          </Link>
        </div>

        <div className="tenant-hero-icon" aria-hidden="true">
          <ClipboardList size={76} strokeWidth={1.3} />
        </div>
      </section>

      <section className="tenant-dashboard-content">
        <div className="tenant-section-heading">
          <div>
            <span className="tenant-eyebrow">OVERVIEW</span>
            <h2>My booking requests</h2>
            <p>Check the latest status of each request.</p>
          </div>

          <button
            type="button"
            className="tenant-refresh-button"
            onClick={loadBookings}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="tenant-stats">
          {[
            { label: "Total requests", value: counts.ALL, icon: ClipboardList },
            { label: "Pending", value: counts.PENDING, icon: Clock3 },
            { label: "Accepted", value: counts.ACCEPTED, icon: CheckCircle2 },
            { label: "Rejected", value: counts.REJECTED, icon: XCircle },
          ].map(({ label, value, icon: Icon }) => (
            <div className="tenant-stat-card" key={label}>
              <span className="tenant-stat-icon">
                <Icon size={20} />
              </span>
              <div>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>

        {notice && (
          <div className="tenant-alert tenant-alert-success">
            <CheckCircle2 size={18} />
            {notice}
          </div>
        )}

        {error && (
          <div className="tenant-alert tenant-alert-error">
            <XCircle size={18} />
            {error}
          </div>
        )}

        <div className="tenant-filter-bar" aria-label="Filter bookings">
          {filters.map((filter) => (
            <button
              type="button"
              key={filter}
              className={
                activeFilter === filter
                  ? "tenant-filter active"
                  : "tenant-filter"
              }
              onClick={() => setActiveFilter(filter)}
            >
              {filter === "ALL"
                ? "All bookings"
                : filter.charAt(0) + filter.slice(1).toLowerCase()}
              <span>{counts[filter]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="tenant-state">
            <LoaderCircle className="tenant-spinner" size={32} />
            <p>Loading your bookings...</p>
          </div>
        ) : visibleBookings.length === 0 ? (
          <div className="tenant-state tenant-empty-state">
            <span className="tenant-empty-icon">
              <CalendarDays size={34} />
            </span>
            <h3>
              {activeFilter === "ALL"
                ? "No booking requests yet"
                : `No ${activeFilter.toLowerCase()} bookings`}
            </h3>
            <p>
              {activeFilter === "ALL"
                ? "Browse available rooms and send a booking request when you find one you like."
                : "Your bookings in this category will appear here."}
            </p>
            {activeFilter === "ALL" && (
              <Link to="/rooms" className="tenant-browse-button">
                Find a room <ArrowRight size={18} />
              </Link>
            )}
          </div>
        ) : (
          <div className="tenant-booking-list">
            {visibleBookings.map((booking) => {
              const status = booking.status || "PENDING";
              const StatusIcon = statusIcons[status] || Clock3;
              const roomId = booking.room_id || booking.roomId;
              const title =
                booking.room_title ||
                booking.title ||
                booking.room?.title ||
                "Room booking";
              const city = booking.city || booking.room?.city;
              const rent =
                booking.monthly_rent ??
                booking.rent ??
                booking.room?.monthly_rent;
              const ownerName =
                booking.owner_name || booking.room?.owner_name;

              return (
                <article className="tenant-booking-card" key={booking.id}>
                  <div className="tenant-booking-main">
                    <div className="tenant-booking-title-row">
                      <h3>{title}</h3>
                      <span
                        className={`tenant-status tenant-status-${status.toLowerCase()}`}
                      >
                        <StatusIcon size={15} />
                        {status.charAt(0) + status.slice(1).toLowerCase()}
                      </span>
                    </div>

                    <div className="tenant-booking-details">
                      {city && (
                        <span>
                          <MapPin size={16} />
                          {city}
                        </span>
                      )}
                      <span>
                        <CalendarDays size={16} />
                        Requested {formatDate(booking.requested_at || booking.created_at)}
                      </span>
                    </div>

                    <div className="tenant-booking-meta">
                      <div>
                        <span>Monthly rent</span>
                        <strong>{formatRent(rent)}</strong>
                      </div>
                      <div>
                        <span>Property owner</span>
                        <strong>{ownerName || "Owner details unavailable"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="tenant-booking-actions">
                    {roomId && (
                      <Link
                        to={`/rooms/${roomId}`}
                        className="tenant-view-link"
                      >
                        View room <ArrowRight size={16} />
                      </Link>
                    )}

                    {status === "PENDING" && (
                      <button
                        type="button"
                        className="tenant-cancel-button"
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancellingId === booking.id}
                      >
                        {cancellingId === booking.id ? (
                          <>
                            <LoaderCircle
                              size={15}
                              className="tenant-spinner"
                            />
                            Cancelling...
                          </>
                        ) : (
                          "Cancel request"
                        )}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default TenantDashboard;
