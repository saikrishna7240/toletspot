
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Clock3,
  LoaderCircle,
  RefreshCw,
  BellRing,
} from "lucide-react";
import api from "../services/api";
import "./Notifications.css";

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/notifications");
      const data = response.data;

      const items = Array.isArray(data)
        ? data
        : data.notifications || data.data || [];

      const safeItems = Array.isArray(items) ? items : [];

      setNotifications(safeItems);
      setUnreadCount(
        typeof data.unreadCount === "number"
          ? data.unreadCount
          : safeItems.filter((item) => !item.is_read).length
      );
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      setError(
        err.response?.data?.message ||
          "Unable to load notifications. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    loadNotifications();
  }, [navigate, loadNotifications]);

  const markAsRead = async (id) => {
    const selected = notifications.find((item) => item.id === id);

    if (!selected || selected.is_read) return;

    setUpdatingId(id);
    setError("");
    setNotice("");

    try {
      await api.patch(`/notifications/${id}/read`);

      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, is_read: true } : item
        )
      );

      setUnreadCount((count) => Math.max(0, count - 1));
      setNotice("Notification marked as read.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not update this notification."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    setUpdatingId("all");
    setError("");
    setNotice("");

    try {
      await api.patch("/notifications/read-all");

      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true }))
      );

      setUnreadCount(0);
      setNotice("All notifications marked as read.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not mark notifications as read."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const visibleNotifications = notifications.filter((item) => {
    if (filter === "UNREAD") return !item.is_read;
    if (filter === "READ") return item.is_read;
    return true;
  });

  return (
    <div className="notifications-page">
      <header className="notifications-hero">
        <div className="notifications-hero-icon">
          <BellRing size={34} />
        </div>

        <div>
          <span className="notifications-eyebrow">YOUR UPDATES</span>
          <h1>Notifications</h1>
          <p>
            Stay updated on your room listings and booking activity.
          </p>
        </div>

        <div className="notifications-unread-badge">
          <Bell size={17} />
          <span>{unreadCount} unread</span>
        </div>
      </header>

      <main className="notifications-content">
        <div className="notifications-toolbar">
          <div className="notifications-filters">
            {["ALL", "UNREAD", "READ"].map((item) => (
              <button
                type="button"
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item === "ALL"
                  ? "All"
                  : item.charAt(0) + item.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="notifications-toolbar-actions">
            <button
              type="button"
              className="notifications-tool-button"
              onClick={loadNotifications}
              disabled={loading}
              aria-label="Refresh notifications"
              title="Refresh"
            >
              <RefreshCw size={17} />
              Refresh
            </button>

            <button
              type="button"
              className="notifications-tool-button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0 || updatingId === "all"}
            >
              <CheckCheck size={17} />
              Mark all read
            </button>
          </div>
        </div>

        {error && (
          <div className="notifications-message error">{error}</div>
        )}

        {notice && (
          <div className="notifications-message success">{notice}</div>
        )}

        {loading ? (
          <div className="notifications-state">
            <LoaderCircle className="notifications-spinner" size={32} />
            <p>Loading notifications...</p>
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="notifications-empty">
            <span className="notifications-empty-icon">
              <Bell size={32} />
            </span>
            <h2>
              {filter === "UNREAD"
                ? "You're all caught up"
                : filter === "READ"
                  ? "No read notifications"
                  : "No notifications yet"}
            </h2>
            <p>
              {filter === "UNREAD"
                ? "New updates will appear here when they arrive."
                : "Updates about your bookings and properties will appear here."}
            </p>
            <Link to="/rooms" className="notifications-browse-link">
              Explore rooms
            </Link>
          </div>
        ) : (
          <div className="notifications-list">
            {visibleNotifications.map((item) => (
              <article
                className={`notification-card ${
                  item.is_read ? "is-read" : "is-unread"
                }`}
                key={item.id}
              >
                <div className="notification-card-icon">
                  <Bell size={20} />
                </div>

                <div className="notification-card-body">
                  <div className="notification-card-heading">
                    <h2>{item.title || "ToLetSpot update"}</h2>
                    {!item.is_read && (
                      <span className="notification-new-label">NEW</span>
                    )}
                  </div>

                  <p>{item.message || "You have a new update."}</p>

                  <span className="notification-date">
                    <Clock3 size={14} />
                    {formatDate(item.created_at)}
                  </span>
                </div>

                {!item.is_read && (
                  <button
                    type="button"
                    className="notification-read-button"
                    onClick={() => markAsRead(item.id)}
                    disabled={updatingId === item.id}
                  >
                    {updatingId === item.id ? (
                      <LoaderCircle
                        size={16}
                        className="notifications-spinner"
                      />
                    ) : (
                      <>
                        <CheckCheck size={16} />
                        Mark read
                      </>
                    )}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Notifications;
