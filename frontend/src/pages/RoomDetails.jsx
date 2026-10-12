
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Home,
  IndianRupee,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";

import api from "../services/api";
import "./RoomDetails.css";

const fallbackImage =
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=85";

function RoomDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [roomMedia, setRoomMedia] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [bookingError, setBookingError] = useState("");

  // Load room details and its gallery.
  useEffect(() => {
    let active = true;

    async function fetchRoom() {
      setLoading(true);
      setError("");
      setRoom(null);
      setRoomMedia([]);
      setActiveImageIndex(0);

      try {
        const response = await api.get(`/rooms/${id}`);
        const data =
          response.data.room ||
          response.data.data ||
          response.data;

        if (!active) return;

        setRoom(data);

        // Load the property's images and videos.
        try {
          const mediaResponse = await api.get(
            `/rooms/${id}/media`
          );

          const media = Array.isArray(mediaResponse.data.media)
            ? mediaResponse.data.media
            : [];

          // Primary image first, then other images, then videos.
          const sortedMedia = [...media].sort((a, b) => {
            if (a.is_primary && !b.is_primary) return -1;
            if (!a.is_primary && b.is_primary) return 1;

            if (
              a.media_type === "IMAGE" &&
              b.media_type === "VIDEO"
            ) {
              return -1;
            }

            if (
              a.media_type === "VIDEO" &&
              b.media_type === "IMAGE"
            ) {
              return 1;
            }

            return 0;
          });

          if (active) {
            setRoomMedia(sortedMedia);
            setActiveImageIndex(0);
          }
        } catch (mediaError) {
          // The room details remain usable even if the gallery fails.
          console.error(
            "Failed to load room gallery:",
            mediaError
          );

          if (active) setRoomMedia([]);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load this room. It may have been removed or is no longer available."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchRoom();

    return () => {
      active = false;
    };
  }, [id]);

  // Submit a tenant booking request.
  async function handleBooking() {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login", {
        state: {
          message:
            "Please log in to request a room booking.",
        },
      });
      return;
    }

    let user = null;

    try {
      user = JSON.parse(
        localStorage.getItem("user") || "null"
      );
    } catch {
      user = null;
    }

    if (user?.role && user.role !== "TENANT") {
      setBookingError(
        "Only tenant accounts can request room bookings."
      );
      return;
    }

    setBookingLoading(true);
    setBookingError("");
    setMessage("");

    try {
      await api.post("/bookings", {
        roomId: room.id,
      });

      setMessage(
        "Your booking request has been sent to the property owner."
      );
    } catch (err) {
      setBookingError(
        err.response?.data?.message ||
          "Could not submit your booking request. Please try again."
      );
    } finally {
      setBookingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="room-details-state">
        <LoaderCircle
          className="details-spinner"
          size={34}
        />
        <p>Loading room details...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="room-details-state">
        <div className="details-state-icon">
          <AlertCircle size={28} />
        </div>

        <h2>Room unavailable</h2>
        <p>{error || "We couldn't find this room."}</p>

        <Link to="/rooms" className="details-back-button">
          <ArrowLeft size={17} />
          Back to rooms
        </Link>
      </div>
    );
  }

  const location =
    [room.city, room.state].filter(Boolean).join(", ") ||
    room.address ||
    "Location available on request";

  const monthlyRent = Number(room.monthly_rent || 0);
  const deposit = Number(room.security_deposit || 0);
  const ownerName =
    room.owner_name ||
    room.owner?.name ||
    "Property owner";

  // Use the database media first, then the legacy image_url.
  const galleryItems =
    roomMedia.length > 0
      ? roomMedia
      : room.image_url
        ? [
            {
              id: "legacy-room-image",
              media_url: room.image_url,
              media_type: "IMAGE",
              is_primary: true,
            },
          ]
        : [
            {
              id: "fallback-room-image",
              media_url: fallbackImage,
              media_type: "IMAGE",
              is_primary: true,
            },
          ];

  const safeIndex = Math.min(
    activeImageIndex,
    galleryItems.length - 1
  );

  const activeMedia = galleryItems[safeIndex];

  function showPreviousImage() {
    setActiveImageIndex((current) =>
      current <= 0
        ? galleryItems.length - 1
        : current - 1
    );
  }

  function showNextImage() {
    setActiveImageIndex((current) =>
      current >= galleryItems.length - 1
        ? 0
        : current + 1
    );
  }

  return (
    <div className="room-details-page">
      <div className="room-details-container">
        <Link to="/rooms" className="room-details-back">
          <ArrowLeft size={17} />
          Back to all rooms
        </Link>

        {/* Property heading */}
        <div className="room-details-heading">
          <div className="room-details-heading-info">
            <span className="room-details-eyebrow">
              <CheckCircle2 size={15} />
              APPROVED LISTING
            </span>

            <h1>{room.title}</h1>

            <p className="room-details-location">
              <MapPin size={18} />
              {location}
            </p>
          </div>

          <div className="room-details-price-heading">
            <strong>
              ₹{monthlyRent.toLocaleString("en-IN")}
            </strong>
            <span>per month</span>
          </div>
        </div>

        <div className="room-details-layout">
          <div className="room-details-main">
            {/* MULTIPLE PHOTO AND VIDEO GALLERY */}
            <section
              className="room-details-gallery"
              aria-label="Property photo gallery"
            >
              <div className="room-details-image-wrap">
                {activeMedia.media_type === "VIDEO" ? (
                  <video
                    key={activeMedia.id || activeMedia.media_url}
                    className="room-details-image"
                    src={activeMedia.media_url}
                    controls
                    playsInline
                    preload="metadata"
                  >
                    Your browser does not support video playback.
                  </video>
                ) : (
                  <img
                    className="room-details-image"
                    src={activeMedia.media_url}
                    alt={`${room.title || "Room"} photo ${
                      safeIndex + 1
                    }`}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = fallbackImage;
                    }}
                  />
                )}

                {galleryItems.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="gallery-nav gallery-prev"
                      onClick={showPreviousImage}
                      aria-label="Previous property photo"
                    >
                      <ArrowLeft size={21} />
                    </button>

                    <button
                      type="button"
                      className="gallery-nav gallery-next"
                      onClick={showNextImage}
                      aria-label="Next property photo"
                    >
                      <ArrowRight size={21} />
                    </button>
                  </>
                )}

                <span className="room-image-approved">
                  <ShieldCheck size={15} />
                  Admin reviewed
                </span>

                <span className="gallery-counter">
                  {safeIndex + 1} / {galleryItems.length}
                </span>
              </div>

              {galleryItems.length > 1 && (
                <div
                  className="room-gallery-thumbnails"
                  aria-label="Choose a property photo or video"
                >
                  {galleryItems.map((media, index) => (
                    <button
                      type="button"
                      key={media.id || media.media_url}
                      className={`room-gallery-thumbnail ${
                        index === safeIndex ? "active" : ""
                      }`}
                      onClick={() =>
                        setActiveImageIndex(index)
                      }
                      aria-label={`View property media ${
                        index + 1
                      }`}
                      aria-pressed={index === safeIndex}
                    >
                      {media.media_type === "VIDEO" ? (
                        <video
                          src={media.media_url}
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={media.media_url}
                          alt={`Property thumbnail ${index + 1}`}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = fallbackImage;
                          }}
                        />
                      )}

                      {media.media_type === "VIDEO" && (
                        <span className="gallery-video-label">
                          VIDEO
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* ROOM OVERVIEW */}
            <section className="room-details-section">
              <h2>Room overview</h2>

              <p className="room-details-description">
                {room.description ||
                  "No description has been provided yet."}
              </p>

              <div className="room-overview-grid">
                <div className="room-overview-item">
                  <div className="overview-icon">
                    <BedDouble size={20} />
                  </div>
                  <div>
                    <span>Room type</span>
                    <strong>
                      {room.room_type || "Not specified"}
                    </strong>
                  </div>
                </div>

                <div className="room-overview-item">
                  <div className="overview-icon">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <span>Security deposit</span>
                    <strong>
                      {room.security_deposit == null
                        ? "Contact owner"
                        : `₹${deposit.toLocaleString("en-IN")}`}
                    </strong>
                  </div>
                </div>

                <div className="room-overview-item">
                  <div className="overview-icon">
                    <CalendarDays size={20} />
                  </div>
                  <div>
                    <span>Available from</span>
                    <strong>
                      {room.available_from
                        ? new Date(
                            room.available_from
                          ).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Contact owner"}
                    </strong>
                  </div>
                </div>

                <div className="room-overview-item">
                  <div className="overview-icon">
                    <Home size={20} />
                  </div>
                  <div>
                    <span>Property status</span>
                    <strong>Available</strong>
                  </div>
                </div>
              </div>
            </section>

            {/* LOCATION */}
            <section className="room-details-section">
              <h2>Location and address</h2>

              <div className="room-address-card">
                <div className="overview-icon">
                  <MapPin size={21} />
                </div>

                <div>
                  <strong>{location}</strong>
                  <p>
                    {[
                      room.address,
                      room.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ") ||
                      "Contact the owner for the full address."}
                  </p>
                </div>
              </div>
            </section>

            {/* BOOKING INFORMATION */}
            <section className="room-details-section">
              <h2>About booking</h2>

              <div className="booking-info-note">
                <ShieldCheck size={21} />
                <p>
                  Your request is sent to the property owner.
                  The owner can review and accept or reject it.
                  A booking is not confirmed until it is accepted.
                </p>
              </div>
            </section>
          </div>

          {/* BOOKING SIDEBAR */}
          <aside className="room-booking-sidebar">
            <div className="booking-card">
              <span className="booking-card-eyebrow">
                MONTHLY RENT
              </span>

              <div className="booking-card-price">
                <IndianRupee size={25} />
                <strong>
                  {monthlyRent.toLocaleString("en-IN")}
                </strong>
              </div>

              <p className="booking-card-caption">
                per month
              </p>

              <div className="booking-card-divider" />

              <div className="booking-summary-row">
                <span>Security deposit</span>
                <strong>
                  {room.security_deposit == null
                    ? "Ask owner"
                    : `₹${deposit.toLocaleString("en-IN")}`}
                </strong>
              </div>

              <div className="booking-summary-row">
                <span>Room type</span>
                <strong>{room.room_type || "Room"}</strong>
              </div>

              <div className="booking-summary-row">
                <span>Availability</span>
                <strong className="availability-label">
                  <span />
                  Available
                </strong>
              </div>

              {message && (
                <div className="booking-success">
                  <CheckCircle2 size={18} />
                  <p>{message}</p>
                </div>
              )}

              {bookingError && (
                <div className="booking-error">
                  <AlertCircle size={18} />
                  <p>{bookingError}</p>
                </div>
              )}

              <button
                type="button"
                className="request-booking-button"
                onClick={handleBooking}
                disabled={
                  bookingLoading || Boolean(message)
                }
              >
                {bookingLoading ? (
                  <>
                    <LoaderCircle
                      className="details-spinner-inline"
                      size={18}
                    />
                    Sending request...
                  </>
                ) : message ? (
                  <>
                    <CheckCircle2 size={18} />
                    Request submitted
                  </>
                ) : (
                  <>
                    Request to book
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <p className="booking-disclaimer">
                No booking is confirmed until the owner accepts
                your request.
              </p>
            </div>

            {/* OWNER INFORMATION */}
            <div className="room-owner-card">
              <div className="owner-avatar">
                <UserRound size={24} />
              </div>

              <div className="owner-info">
                <span>LISTED BY</span>
                <strong>{ownerName}</strong>
                <p>
                  <CheckCircle2 size={14} />
                  Property listing approved
                </p>
              </div>
            </div>

            {/* SAFETY NOTE */}
            <div className="room-safety-note">
              <ShieldCheck size={19} />
              <div>
                <strong>Stay informed</strong>
                <p>
                  Verify property details and payment terms
                  directly before paying a deposit.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default RoomDetails;
