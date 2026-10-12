import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Home,
  ImagePlus,
  IndianRupee,
  Mail,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import api from "../services/api";
import "./OwnerDashboard.css";

const initialForm = {
  title: "",
  description: "",
  room_type: "Single",
  monthly_rent: "",
  security_deposit: "",
  address: "",
  city: "",
  state: "Telangana",
  pincode: "",
  available_from: "",
};

function getList(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

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

function OwnerDashboard() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingActionId, setBookingActionId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [formData, setFormData] = useState(initialForm);

  const [selectedMedia, setSelectedMedia] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);

  // Generate previews for newly selected images and videos.
  useEffect(() => {
    const previews = selectedMedia.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/"),
    }));

    setMediaPreviews(previews);

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [selectedMedia]);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/rooms/my");
      setRooms(getList(response.data, "rooms"));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your property listings."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    setBookingError("");

    try {
      const response = await api.get("/bookings/owner");
      setBookings(getList(response.data, "bookings"));
    } catch (err) {
      setBookingError(
        err.response?.data?.message ||
          "Unable to load tenant enquiries. Check your booking API."
      );
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    let user = null;

    try {
      user = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      localStorage.removeItem("user");
    }

    if (user?.role && user.role !== "OWNER") {
      navigate(user.role === "ADMIN" ? "/admin" : "/rooms");
      return;
    }

    loadRooms();
    loadBookings();
  }, [navigate, loadRooms, loadBookings]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleMediaChange(event) {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(
      (file) =>
        file.type.startsWith("image/") ||
        file.type.startsWith("video/")
    );

    if (validFiles.length !== files.length) {
      setError("Only image and video files are allowed.");
    } else {
      setError("");
    }

    const combined = [...selectedMedia, ...validFiles];

    if (combined.length > 10) {
      setError("You can select a maximum of 10 files.");
      setSelectedMedia(combined.slice(0, 10));
    } else {
      setSelectedMedia(combined);
    }

    // Allow the same file to be selected again.
    event.target.value = "";
  }

  function removeSelectedMedia(indexToRemove) {
    setSelectedMedia((current) =>
      current.filter((_, index) => index !== indexToRemove)
    );
  }

  function resetPropertyForm() {
    setFormData(initialForm);
    setSelectedMedia([]);
    setEditingRoomId(null);
    setShowForm(false);
  }

  // Populate the form with an existing property's details.
  function startEditRoom(room) {
    setError("");
    setSuccess("");
    setEditingRoomId(room.id);

    setFormData({
      title: room.title || "",
      description: room.description || "",
      room_type: room.room_type || "Single",
      monthly_rent: room.monthly_rent ?? "",
      security_deposit: room.security_deposit ?? "",
      address: room.address || "",
      city: room.city || "",
      state: room.state || "Telangana",
      pincode: room.pincode || "",
      available_from: room.available_from
        ? String(room.available_from).slice(0, 10)
        : "",
    });

    // These are additional files, not replacements for existing media.
    setSelectedMedia([]);
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    const isEditing = Boolean(editingRoomId);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        room_type: formData.room_type,
        monthly_rent: Number(formData.monthly_rent),
        security_deposit:
          formData.security_deposit === ""
            ? null
            : Number(formData.security_deposit),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        available_from: formData.available_from || null,
      };

      let room;

      if (isEditing) {
        // Requires PUT /api/rooms/:id in the backend.
        const response = await api.put(
          `/rooms/${editingRoomId}`,
          payload
        );

        room =
          response.data?.room ||
          response.data?.data?.room ||
          response.data?.data ||
          response.data;

        // Some APIs return only a success message.
        if (!room?.id) {
          room = { ...payload, id: editingRoomId };
        }
      } else {
        const response = await api.post("/rooms", payload);

        room =
          response.data?.room ||
          response.data?.data?.room ||
          response.data?.data ||
          response.data;
      }

      let mediaWarning = "";

      if (selectedMedia.length > 0 && room?.id) {
        try {
          const mediaFormData = new FormData();

          selectedMedia.forEach((file) => {
            mediaFormData.append("media", file);
          });

          await api.post(
            `/rooms/${room.id}/media`,
            mediaFormData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );
        } catch (mediaError) {
          console.error("Property saved but media upload failed:", mediaError);

          mediaWarning =
            " Property details were saved, but the new media could not be uploaded. Check your media upload API and room status permissions.";
        }
      }

      setSuccess(
        `${
          isEditing
            ? "Property details updated successfully."
            : "Your room has been submitted successfully. It will appear publicly after admin approval."
        }${mediaWarning}`
      );

      resetPropertyForm();
      await loadRooms();
    } catch (err) {
      console.error("Save property error:", err);

      setError(
        err.response?.data?.message ||
          (isEditing
            ? "Could not update the property. Check that PUT /api/rooms/:id exists in your backend."
            : "Could not submit your room. Please check your details and try again.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBookingAction(bookingId, status) {
    const action = status === "ACCEPTED" ? "accept" : "reject";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this tenant's booking request?`
    );

    if (!confirmed) return;

    setBookingActionId(bookingId);
    setBookingError("");
    setBookingMessage("");

    try {
      const response = await api.patch(
        `/bookings/${bookingId}/status`,
        { status }
      );

      setBookingMessage(
        response.data?.message ||
          `Booking request ${
            action === "accept" ? "accepted" : "rejected"
          } successfully.`
      );

      await loadBookings();
    } catch (err) {
      setBookingError(
        err.response?.data?.message ||
          `Unable to ${action} this booking request.`
      );
    } finally {
      setBookingActionId(null);
    }
  }

  const pendingCount = rooms.filter(
    (room) => room.status === "PENDING"
  ).length;

  const approvedCount = rooms.filter(
    (room) => room.status === "APPROVED"
  ).length;

  const rejectedCount = rooms.filter(
    (room) => room.status === "REJECTED"
  ).length;

  const pendingBookingCount = bookings.filter(
    (booking) => booking.status === "PENDING"
  ).length;

  function getStatusIcon(status) {
    if (status === "APPROVED") return <CheckCircle2 size={15} />;

    if (status === "REJECTED" || status === "DELETED") {
      return <XCircle size={15} />;
    }

    return <Clock3 size={15} />;
  }

  function getStatusLabel(status) {
    if (status === "APPROVED") return "Approved";
    if (status === "REJECTED") return "Rejected";
    if (status === "DELETED") return "Removed";

    return "Pending review";
  }

  return (
    <div className="owner-dashboard">
      <header className="owner-dashboard-header">
        <div className="owner-dashboard-header-inner">
          <div>
            <span className="owner-dashboard-eyebrow">
              PROPERTY MANAGEMENT
            </span>

            <h1>Owner dashboard</h1>

            <p>
              Manage your rooms and respond to tenant booking requests.
            </p>
          </div>

          <button
            type="button"
            className="owner-add-button"
            onClick={() => {
              if (showForm) {
                resetPropertyForm();
              } else {
                setEditingRoomId(null);
                setFormData(initialForm);
                setSelectedMedia([]);
                setShowForm(true);
              }

              setSuccess("");
              setError("");
            }}
          >
            {showForm ? <XCircle size={18} /> : <Plus size={19} />}
            {showForm ? "Close form" : "Add a property"}
          </button>
        </div>
      </header>

      <main className="owner-dashboard-main">
        {error && (
          <div className="owner-alert owner-alert-error">
            <XCircle size={19} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="owner-alert owner-alert-success">
            <CheckCircle2 size={19} />
            <span>{success}</span>
          </div>
        )}

        {/* Property statistics */}
        <section className="owner-stats-grid">
          <div className="owner-stat-card">
            <div className="owner-stat-icon owner-stat-total">
              <Home size={22} />
            </div>
            <div>
              <span>Total listings</span>
              <strong>{rooms.length}</strong>
            </div>
          </div>

          <div className="owner-stat-card">
            <div className="owner-stat-icon owner-stat-pending">
              <Clock3 size={22} />
            </div>
            <div>
              <span>Pending review</span>
              <strong>{pendingCount}</strong>
            </div>
          </div>

          <div className="owner-stat-card">
            <div className="owner-stat-icon owner-stat-approved">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span>Approved</span>
              <strong>{approvedCount}</strong>
            </div>
          </div>

          <div className="owner-stat-card">
            <div className="owner-stat-icon owner-stat-rejected">
              <XCircle size={22} />
            </div>
            <div>
              <span>Rejected</span>
              <strong>{rejectedCount}</strong>
            </div>
          </div>
        </section>

        {/* Tenant enquiries */}
        <section className="owner-enquiries-section">
          <div className="owner-listings-heading">
            <div>
              <span className="owner-dashboard-eyebrow">
                TENANT ACTIVITY
              </span>

              <h2>
                Tenant Enquiries{" "}
                <span className="owner-enquiry-count">
                  {pendingBookingCount}
                </span>
              </h2>

              <p>
                Review tenants who have requested to book your rooms.
              </p>
            </div>

            <button
              type="button"
              className="owner-refresh-button"
              onClick={loadBookings}
              disabled={bookingsLoading}
            >
              <RefreshCw
                size={16}
                className={bookingsLoading ? "owner-button-spinner" : ""}
              />
              Refresh
            </button>
          </div>

          {bookingError && (
            <div className="owner-alert owner-alert-error">
              <XCircle size={19} />
              <span>{bookingError}</span>
            </div>
          )}

          {bookingMessage && (
            <div className="owner-alert owner-alert-success">
              <CheckCircle2 size={19} />
              <span>{bookingMessage}</span>
            </div>
          )}

          {bookingsLoading ? (
            <div className="owner-listings-state">
              <RefreshCw
                className="owner-button-spinner"
                size={28}
              />
              <p>Loading tenant enquiries...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="owner-enquiries-empty">
              <div className="owner-empty-icon">
                <Mail size={30} />
              </div>

              <h3>No tenant enquiries yet</h3>

              <p>
                When a tenant requests to book one of your approved rooms,
                the request will appear here.
              </p>
            </div>
          ) : (
            <div className="owner-enquiries-list">
              {bookings.map((booking) => {
                const bookingId = booking.booking_id || booking.id;
                const status = booking.status || "PENDING";
                const isPending = status === "PENDING";
                const isBusy = bookingActionId === bookingId;

                const roomTitle =
                  booking.room_title ||
                  booking.title ||
                  booking.room?.title ||
                  "Room booking";

                const tenantName =
                  booking.tenant_name ||
                  booking.name ||
                  booking.tenant?.name ||
                  "Tenant";

                const tenantEmail =
                  booking.tenant_email ||
                  booking.email ||
                  booking.tenant?.email ||
                  "";

                const roomRent =
                  booking.monthly_rent ??
                  booking.rent ??
                  booking.room?.monthly_rent ??
                  0;

                const location = [
                  booking.city || booking.room?.city,
                  booking.state || booking.room?.state,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <article
                    className="owner-enquiry-card"
                    key={bookingId}
                  >
                    <div className="owner-enquiry-top">
                      <div className="owner-enquiry-room-icon">
                        <BedDouble size={23} />
                      </div>

                      <div className="owner-enquiry-room">
                        <h3>{roomTitle}</h3>

                        <p>
                          <IndianRupee size={15} />
                          {Number(roomRent).toLocaleString("en-IN")}
                          <span>/ month</span>
                        </p>

                        {location && (
                          <span className="owner-enquiry-location">
                            <MapPin size={14} />
                            {location}
                          </span>
                        )}
                      </div>

                      <span
                        className={`owner-enquiry-status owner-enquiry-status-${status.toLowerCase()}`}
                      >
                        {status === "ACCEPTED" ? (
                          <CheckCircle2 size={14} />
                        ) : status === "REJECTED" ? (
                          <XCircle size={14} />
                        ) : (
                          <Clock3 size={14} />
                        )}

                        {status.charAt(0) +
                          status.slice(1).toLowerCase()}
                      </span>
                    </div>

                    <div className="owner-enquiry-tenant">
                      <div className="owner-enquiry-tenant-icon">
                        <UserRound size={20} />
                      </div>

                      <div>
                        <strong>{tenantName}</strong>

                        {tenantEmail ? (
                          <a href={`mailto:${tenantEmail}`}>
                            <Mail size={14} />
                            {tenantEmail}
                          </a>
                        ) : (
                          <span className="owner-enquiry-no-email">
                            Email unavailable
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="owner-enquiry-date">
                      <CalendarDays size={15} />
                      Requested{" "}
                      {formatDate(
                        booking.requested_at || booking.created_at
                      )}
                    </div>

                    {isPending && (
                      <div className="owner-enquiry-actions">
                        <button
                          type="button"
                          className="owner-enquiry-reject"
                          disabled={isBusy}
                          onClick={() =>
                            handleBookingAction(bookingId, "REJECTED")
                          }
                        >
                          <XCircle size={16} />
                          Reject
                        </button>

                        <button
                          type="button"
                          className="owner-enquiry-accept"
                          disabled={isBusy}
                          onClick={() =>
                            handleBookingAction(bookingId, "ACCEPTED")
                          }
                        >
                          <CheckCircle2 size={16} />
                          {isBusy ? "Updating..." : "Accept request"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Add or edit property form */}
        {showForm && (
          <section className="owner-form-panel">
            <div className="owner-form-heading">
              <div>
                <span className="owner-dashboard-eyebrow">
                  {editingRoomId ? "EDIT LISTING" : "NEW LISTING"}
                </span>

                <h2>
                  {editingRoomId
                    ? "Edit property details"
                    : "Add a room for rent"}
                </h2>

                <p>
                  {editingRoomId
                    ? "Update the property details and save your changes."
                    : "Provide accurate property details. An admin will review your submission before it becomes public."}
                </p>
              </div>
            </div>

            <form
              className="owner-property-form"
              onSubmit={handleSubmit}
            >
              <div className="owner-form-grid">
                <label className="owner-form-field owner-form-full">
                  <span>Property title *</span>
                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Furnished room near the city centre"
                    required
                    maxLength={150}
                  />
                </label>

                <label className="owner-form-field owner-form-full">
                  <span>Description *</span>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe the room, facilities and nearby landmarks."
                    rows={4}
                    required
                  />
                </label>

                <label className="owner-form-field">
                  <span>Room type *</span>
                  <select
                    name="room_type"
                    value={formData.room_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="Single">Single</option>
                    <option value="Shared">Shared</option>
                    <option value="Private">Private</option>
                    <option value="1 BHK">1 BHK</option>
                    <option value="2 BHK">2 BHK</option>
                    <option value="3 BHK">3 BHK</option>
                  </select>
                </label>

                <label className="owner-form-field">
                  <span>Monthly rent (₹) *</span>
                  <input
                    name="monthly_rent"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.monthly_rent}
                    onChange={handleChange}
                    placeholder="e.g. 8000"
                    required
                  />
                </label>

                <label className="owner-form-field">
                  <span>Security deposit (₹)</span>
                  <input
                    name="security_deposit"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.security_deposit}
                    onChange={handleChange}
                    placeholder="e.g. 15000"
                  />
                </label>

                <label className="owner-form-field">
                  <span>Available from</span>
                  <input
                    name="available_from"
                    type="date"
                    value={formData.available_from}
                    onChange={handleChange}
                  />
                </label>

                <label className="owner-form-field owner-form-full">
                  <span>Street address *</span>
                  <input
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="House number, street and locality"
                    required
                  />
                </label>

                <label className="owner-form-field">
                  <span>City *</span>
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Hyderabad"
                    required
                  />
                </label>

                <label className="owner-form-field">
                  <span>State *</span>
                  <input
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="State"
                    required
                  />
                </label>

                <label className="owner-form-field">
                  <span>PIN code *</span>
                  <input
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="6-digit PIN code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                  />
                </label>

                {/* Multiple image and video selection */}
                <div className="owner-form-field owner-form-full owner-media-field">
                  <span>Property photos and videos (optional)</span>

                  <label
                    className="owner-media-upload"
                    htmlFor="owner-property-media"
                  >
                    <ImagePlus size={22} />
                    <strong>Select photos and videos</strong>
                    <small>
                      Choose up to 10 files. Images and videos are supported.
                    </small>

                    <input
                      id="owner-property-media"
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleMediaChange}
                    />
                  </label>

                  {mediaPreviews.length > 0 && (
                    <div className="owner-media-preview-grid">
                      {mediaPreviews.map((preview, index) => (
                        <div
                          className="owner-media-preview"
                          key={`${preview.file.name}-${index}`}
                        >
                          {preview.isVideo ? (
                            <video
                              src={preview.url}
                              controls
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={preview.url}
                              alt={`Property preview ${index + 1}`}
                            />
                          )}

                          <span
                            className="owner-media-file-name"
                            title={preview.file.name}
                          >
                            {preview.file.name}
                          </span>

                          <button
                            type="button"
                            className="owner-media-remove"
                            aria-label={`Remove ${preview.file.name}`}
                            onClick={() => removeSelectedMedia(index)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <small className="owner-media-help">
                    Maximum 10 files per listing. Newly selected files will be
                    added to the property.
                  </small>
                </div>
              </div>

              <div className="owner-form-actions">
                <button
                  type="button"
                  className="owner-cancel-button"
                  onClick={resetPropertyForm}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="owner-submit-button"
                  disabled={submitting}
                >
                  {submitting ? (
                    <RefreshCw
                      className="owner-button-spinner"
                      size={17}
                    />
                  ) : editingRoomId ? (
                    <Pencil size={17} />
                  ) : (
                    <Send size={17} />
                  )}

                  {submitting
                    ? editingRoomId
                      ? "Saving changes..."
                      : "Submitting..."
                    : editingRoomId
                      ? "Save changes"
                      : "Submit for approval"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Existing property listings */}
        <section className="owner-listings-section">
          <div className="owner-listings-heading">
            <div>
              <span className="owner-dashboard-eyebrow">
                YOUR PROPERTIES
              </span>
              <h2>My listings</h2>
            </div>

            <button
              type="button"
              className="owner-refresh-button"
              onClick={loadRooms}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={loading ? "owner-button-spinner" : ""}
              />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="owner-listings-state">
              <RefreshCw
                className="owner-button-spinner"
                size={28}
              />
              <p>Loading your listings...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="owner-empty-state">
              <div className="owner-empty-icon">
                <BedDouble size={31} />
              </div>

              <h3>No properties listed yet</h3>

              <p>
                Add your first room to get started. Your submission will remain
                private until an admin approves it.
              </p>

              <button
                type="button"
                className="owner-submit-button"
                onClick={() => {
                  setEditingRoomId(null);
                  setFormData(initialForm);
                  setSelectedMedia([]);
                  setShowForm(true);
                }}
              >
                <Plus size={18} />
                Add your first room
              </button>
            </div>
          ) : (
            <div className="owner-listings-list">
              {rooms.map((room) => (
                <article
                  className="owner-listing-card"
                  key={room.id}
                >
                  <div className="owner-listing-image">
                    <Home size={29} />
                  </div>

                  <div className="owner-listing-info">
                    <div className="owner-listing-title-row">
                      <h3>{room.title}</h3>

                      <span
                        className={`owner-status owner-status-${String(
                          room.status || "PENDING"
                        ).toLowerCase()}`}
                      >
                        {getStatusIcon(room.status)}
                        {getStatusLabel(room.status)}
                      </span>
                    </div>

                    <p className="owner-listing-location">
                      <MapPin size={15} />
                      {[room.city, room.state]
                        .filter(Boolean)
                        .join(", ") ||
                        room.address ||
                        "Location not provided"}
                    </p>

                    <div className="owner-listing-meta">
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

                    {room.status === "REJECTED" &&
                      room.rejection_reason && (
                        <p className="owner-rejection-reason">
                          <strong>Review feedback:</strong>{" "}
                          {room.rejection_reason}
                        </p>
                      )}

                    {room.status === "APPROVED" && (
                      <p className="owner-approved-note">
                        <ShieldCheck size={14} />
                        Your room is publicly visible.
                      </p>
                    )}
                  </div>

                  <div className="owner-listing-actions">
                    <button
                      type="button"
                      className="owner-edit-button"
                      onClick={() => startEditRoom(room)}
                    >
                      <Pencil size={15} />
                      Edit room
                    </button>

                    {room.status === "APPROVED" && (
                      <Link
                        to={`/rooms/${room.id}`}
                        className="owner-view-link"
                      >
                        View <ArrowRight size={16} />
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default OwnerDashboard;
