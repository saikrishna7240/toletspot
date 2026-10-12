
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Clock3,
  CheckCircle2,
  XCircle,
  Trash2,
  MapPin,
  BedDouble,
  IndianRupee,
  RefreshCw,
  Eye,
  AlertCircle,
  ClipboardCheck,
  X,
} from "lucide-react";
import api from "../services/api";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("PENDING");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState("");

  const loadPendingRooms = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/admin/rooms/pending");
      const data = Array.isArray(response.data)
        ? response.data
        : response.data.rooms || response.data.data || [];

      setRooms(data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError("Admin access is required to review property listings.");
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to load pending room submissions."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!token) {
      navigate("/login");
      return;
    }

    if (user?.role && user.role !== "ADMIN") {
      navigate(user.role === "OWNER" ? "/owner" : "/rooms");
      return;
    }

    loadPendingRooms();
  }, [navigate, loadPendingRooms]);

  async function handleApprove(room) {
    const confirmed = window.confirm(
      `Approve "${room.title}"? It will become publicly visible.`
    );

    if (!confirmed) return;

    setActionId(room.id);
    setError("");
    setSuccess("");

    try {
      await api.put(`/admin/rooms/${room.id}/approve`);

      setRooms((previous) =>
        previous.filter((item) => item.id !== room.id)
      );

      setSuccess(`"${room.title}" was approved successfully.`);
      setSelectedRoom(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to approve this room. Please try again."
      );
    } finally {
      setActionId("");
    }
  }

  function openRejectDialog(room) {
    setSelectedRoom(room);
    setRejectingId(room.id);
    setRejectReason("");
    setError("");
    setSuccess("");
  }

  async function handleReject(event) {
    event.preventDefault();

    if (!rejectReason.trim()) {
      setError("Please provide a reason for rejecting this room.");
      return;
    }

    setActionId(rejectingId);
    setError("");
    setSuccess("");

    try {
      await api.put(`/admin/rooms/${rejectingId}/reject`, {
        reason: rejectReason.trim(),
      });

      const rejectedRoom = rooms.find((room) => room.id === rejectingId);

      setRooms((previous) =>
        previous.filter((room) => room.id !== rejectingId)
      );

      setSuccess(
        `"${rejectedRoom?.title || "Room"}" was rejected. The owner can see your feedback.`
      );

      setSelectedRoom(null);
      setRejectingId("");
      setRejectReason("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reject this room. Please try again."
      );
    } finally {
      setActionId("");
    }
  }

  async function handleDelete(room) {
    const confirmed = window.confirm(
      `Remove "${room.title}" from the platform?`
    );

    if (!confirmed) return;

    setActionId(room.id);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/admin/rooms/${room.id}`);

      setRooms((previous) =>
        previous.filter((item) => item.id !== room.id)
      );

      setSuccess(`"${room.title}" was removed from the platform.`);
      setSelectedRoom(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to remove this room. Please try again."
      );
    } finally {
      setActionId("");
    }
  }

  const pendingCount = rooms.length;

  const visibleRooms = rooms.filter((room) => {
    if (filter === "ALL") return true;
    return room.status === filter;
  });

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div className="admin-dashboard-header-inner">
          <div className="admin-heading-brand">
            <div className="admin-brand-icon">
              <ShieldCheck size={25} />
            </div>
            <div>
              <span className="admin-eyebrow">TOLETSPOT MANAGEMENT</span>
              <h1>Admin dashboard</h1>
              <p>Review submissions and keep property listings trustworthy.</p>
            </div>
          </div>

          <button
            className="admin-refresh-button"
            onClick={loadPendingRooms}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "admin-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </header>

      <main className="admin-dashboard-main">
        {error && (
          <div className="admin-alert admin-alert-error">
            <AlertCircle size={19} />
            <span>{error}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="admin-alert admin-alert-success">
            <CheckCircle2 size={19} />
            <span>{success}</span>
            <button
              type="button"
              aria-label="Dismiss success message"
              onClick={() => setSuccess("")}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon admin-stat-pending">
              <Clock3 size={23} />
            </div>
            <div>
              <span>Pending submissions</span>
              <strong>{pendingCount}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon admin-stat-review">
              <ClipboardCheck size={23} />
            </div>
            <div>
              <span>Review queue</span>
              <strong>{pendingCount}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon admin-stat-approved">
              <CheckCircle2 size={23} />
            </div>
            <div>
              <span>Admin access</span>
              <strong>Active</strong>
            </div>
          </div>
        </section>

        <section className="admin-review-section">
          <div className="admin-review-heading">
            <div>
              <span className="admin-eyebrow">PROPERTY MODERATION</span>
              <h2>Room submissions</h2>
              <p>
                Review the information before making a listing visible to tenants.
              </p>
            </div>

            <span className="admin-queue-badge">
              <Clock3 size={14} />
              {pendingCount} awaiting review
            </span>
          </div>

          <div className="admin-filter-tabs">
            <button
              className={filter === "PENDING" ? "active" : ""}
              onClick={() => setFilter("PENDING")}
            >
              Pending
            </button>
            <button
              className={filter === "ALL" ? "active" : ""}
              onClick={() => setFilter("ALL")}
            >
              Current queue
            </button>
          </div>

          {loading ? (
            <div className="admin-state">
              <RefreshCw className="admin-spin" size={30} />
              <p>Loading submissions...</p>
            </div>
          ) : visibleRooms.length === 0 ? (
            <div className="admin-state admin-empty-state">
              <div className="admin-empty-icon">
                <CheckCircle2 size={32} />
              </div>
              <h3>No pending submissions</h3>
              <p>
                There are no rooms waiting for review right now.
                New owner submissions will appear here.
              </p>
              <button
                className="admin-refresh-button"
                onClick={loadPendingRooms}
              >
                <RefreshCw size={16} />
                Check again
              </button>
            </div>
          ) : (
            <div className="admin-submissions-list">
              {visibleRooms.map((room) => (
                <article className="admin-room-card" key={room.id}>
                  <div className="admin-room-visual">
                    <BedDouble size={35} />
                    <span className="admin-room-visual-label">
                      Property submission
                    </span>
                  </div>

                  <div className="admin-room-content">
                    <div className="admin-room-title-row">
                      <h3>{room.title}</h3>
                      <span className="admin-pending-badge">
                        <Clock3 size={13} />
                        {room.status || "PENDING"}
                      </span>
                    </div>

                    <p className="admin-room-description">
                      {room.description || "No description provided."}
                    </p>

                    <div className="admin-room-meta">
                      <span>
                        <MapPin size={15} />
                        {[room.city, room.state].filter(Boolean).join(", ") ||
                          room.address ||
                          "Location unavailable"}
                      </span>
                      <span>
                        <BedDouble size={15} />
                        {room.room_type || "Room"}
                      </span>
                      <span>
                        <IndianRupee size={15} />
                        {Number(room.monthly_rent || 0).toLocaleString("en-IN")}
                        / month
                      </span>
                    </div>

                    <div className="admin-room-owner">
                      Submitted by:{" "}
                      <strong>{room.owner_name || "Property owner"}</strong>
                    </div>

                    <div className="admin-room-actions">
                      <button
                        className="admin-action-button admin-approve-button"
                        onClick={() => handleApprove(room)}
                        disabled={Boolean(actionId)}
                      >
                        {actionId === room.id ? (
                          <RefreshCw size={16} className="admin-spin" />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        Approve
                      </button>

                      <button
                        className="admin-action-button admin-reject-button"
                        onClick={() => openRejectDialog(room)}
                        disabled={Boolean(actionId)}
                      >
                        <XCircle size={16} />
                        Reject
                      </button>

                      <button
                        className="admin-action-button admin-delete-button"
                        onClick={() => handleDelete(room)}
                        disabled={Boolean(actionId)}
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>

                      <button
                        className="admin-action-button admin-view-button"
                        onClick={() => setSelectedRoom(room)}
                        disabled={Boolean(actionId)}
                      >
                        <Eye size={16} />
                        Details
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {selectedRoom && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedRoom(null);
              setRejectingId("");
              setRejectReason("");
            }
          }}
        >
          <section
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-modal-title"
          >
            <div className="admin-modal-heading">
              <div>
                <span className="admin-eyebrow">
                  {rejectingId === selectedRoom.id
                    ? "REJECT SUBMISSION"
                    : "SUBMISSION DETAILS"}
                </span>
                <h2 id="admin-modal-title">{selectedRoom.title}</h2>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                aria-label="Close dialog"
                onClick={() => {
                  setSelectedRoom(null);
                  setRejectingId("");
                  setRejectReason("");
                }}
              >
                <X size={19} />
              </button>
            </div>

            <div className="admin-modal-details">
              <p>
                <strong>Address:</strong>{" "}
                {[selectedRoom.address, selectedRoom.city, selectedRoom.state]
                  .filter(Boolean)
                  .join(", ") || "Not provided"}
              </p>
              <p>
                <strong>Room type:</strong>{" "}
                {selectedRoom.room_type || "Not specified"}
              </p>
              <p>
                <strong>Monthly rent:</strong>{" "}
                ₹{Number(selectedRoom.monthly_rent || 0).toLocaleString("en-IN")}
              </p>
              <p>
                <strong>Security deposit:</strong>{" "}
                {selectedRoom.security_deposit == null
                  ? "Not specified"
                  : `₹${Number(selectedRoom.security_deposit).toLocaleString("en-IN")}`}
              </p>
              <p>
                <strong>Description:</strong>{" "}
                {selectedRoom.description || "No description provided."}
              </p>
            </div>

            {rejectingId === selectedRoom.id ? (
              <form className="admin-reject-form" onSubmit={handleReject}>
                <label htmlFor="reject-reason">
                  Reason for rejection *
                </label>
                <textarea
                  id="reject-reason"
                  rows={4}
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="Explain what the owner needs to correct..."
                  required
                  maxLength={1000}
                />

                <div className="admin-modal-actions">
                  <button
                    type="button"
                    className="admin-modal-cancel"
                    onClick={() => {
                      setSelectedRoom(null);
                      setRejectingId("");
                      setRejectReason("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-action-button admin-reject-button"
                    disabled={Boolean(actionId)}
                  >
                    <XCircle size={16} />
                    {actionId ? "Rejecting..." : "Confirm rejection"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-modal-cancel"
                  onClick={() => setSelectedRoom(null)}
                >
                  Close
                </button>
                {selectedRoom.status === "PENDING" && (
                  <button
                    type="button"
                    className="admin-action-button admin-approve-button"
                    onClick={() => handleApprove(selectedRoom)}
                    disabled={Boolean(actionId)}
                  >
                    <CheckCircle2 size={16} />
                    Approve room
                  </button>
                )}
                {selectedRoom.status === "PENDING" && (
                  <button
                    type="button"
                    className="admin-action-button admin-reject-button"
                    onClick={() => openRejectDialog(selectedRoom)}
                    disabled={Boolean(actionId)}
                  >
                    <XCircle size={16} />
                    Reject room
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
