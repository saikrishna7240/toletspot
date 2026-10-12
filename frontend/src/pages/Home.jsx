
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  CheckCircle2,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import api from "../services/api";
import "./Home.css";

const fallbackImages = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=80",
];

function Home() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [city, setCity] = useState("");
  const [maxRent, setMaxRent] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchRooms() {
      try {
        const response = await api.get("/rooms");

        if (active) {
          const data = Array.isArray(response.data)
            ? response.data
            : response.data.rooms || response.data.data || [];

          setRooms(data.slice(0, 3));
        }
      } catch (err) {
        if (active) {
          setError("Unable to load rooms right now.");
          console.error("Failed to fetch rooms:", err);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchRooms();

    return () => {
      active = false;
    };
  }, []);

  function handleSearch(event) {
    event.preventDefault();

    const params = new URLSearchParams();

    if (city.trim()) params.set("city", city.trim());
    if (maxRent) params.set("maxRent", maxRent);

    navigate(`/rooms${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function getRoomImage(room, index) {
    return room.image_url || fallbackImages[index % fallbackImages.length];
  }

  function getRoomLocation(room) {
    return [room.city, room.state].filter(Boolean).join(", ") ||
      room.address ||
      "Location available on request";
  }

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <CheckCircle2 size={16} />
            Find a place that feels like home
          </div>

          <h1>
            Your next room,
            <br />
            <span>just a search away.</span>
          </h1>

          <p className="hero-description">
            Discover rooms that fit your lifestyle and budget.
            Search verified listings and connect with property owners
            with confidence.
          </p>

          <form className="hero-search" onSubmit={handleSearch}>
            <label className="search-field">
              <MapPin size={20} />
              <span className="search-field-content">
                <span className="search-label">Location</span>
                <input
                  type="text"
                  placeholder="Enter city, e.g. Hyderabad"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
              </span>
            </label>

            <div className="search-divider" />

            <label className="search-field rent-field">
              <Wallet size={20} />
              <span className="search-field-content">
                <span className="search-label">Monthly budget</span>
                <select
                  value={maxRent}
                  onChange={(event) => setMaxRent(event.target.value)}
                >
                  <option value="">Any budget</option>
                  <option value="5000">Up to ₹5,000</option>
                  <option value="10000">Up to ₹10,000</option>
                  <option value="15000">Up to ₹15,000</option>
                  <option value="20000">Up to ₹20,000</option>
                  <option value="30000">Up to ₹30,000</option>
                </select>
              </span>
            </label>

            <button className="hero-search-button" type="submit">
              <Search size={19} />
              <span>Find rooms</span>
            </button>
          </form>

          <div className="hero-trust">
            <div className="trust-icon">
              <ShieldCheck size={19} />
            </div>
            <p>
              <strong>Reviewed listings</strong>
              <span>Rooms appear publicly after admin approval.</span>
            </p>
          </div>
        </div>

        <div className="hero-visual" aria-label="Comfortable room interior">
          <img
            className="hero-main-image"
            src={fallbackImages[0]}
            alt="Bright and comfortable room interior"
          />

          <div className="hero-floating-card">
            <div className="floating-card-icon">
              <BedDouble size={22} />
            </div>
            <div>
              <strong>Find your space</strong>
              <span>Rooms for different budgets</span>
            </div>
            <ArrowUpRight size={19} className="floating-arrow" />
          </div>

          <div className="hero-image-caption">
            <span className="caption-dot" />
            Make your next move confidently
          </div>
        </div>

        <div className="hero-decoration hero-decoration-one" />
        <div className="hero-decoration hero-decoration-two" />
      </section>

      <section className="home-benefits">
        <div className="benefit-item">
          <div className="benefit-icon"><Search size={21} /></div>
          <div>
            <h3>Easy discovery</h3>
            <p>Search by location and budget.</p>
          </div>
        </div>

        <div className="benefit-item">
          <div className="benefit-icon"><ShieldCheck size={21} /></div>
          <div>
            <h3>Reviewed listings</h3>
            <p>Admin-approved rooms go public.</p>
          </div>
        </div>

        <div className="benefit-item">
          <div className="benefit-icon"><Wallet size={21} /></div>
          <div>
            <h3>Budget friendly</h3>
            <p>Find options that suit your needs.</p>
          </div>
        </div>
      </section>

      <section className="featured-section">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">EXPLORE STAYS</span>
            <h2>Rooms worth discovering</h2>
            <p>Explore available rooms and find your next place to stay.</p>
          </div>

          <Link to="/rooms" className="view-all-link">
            View all rooms <ArrowRight size={18} />
          </Link>
        </div>

        {loading ? (
          <div className="room-state">
            <div className="loading-spinner" />
            <p>Finding available rooms...</p>
          </div>
        ) : error ? (
          <div className="room-state">
            <p>{error}</p>
            <button
              className="secondary-button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : rooms.length === 0 ? (
          <div className="empty-rooms">
            <div className="empty-rooms-icon">
              <BedDouble size={30} />
            </div>
            <h3>New rooms are on the way</h3>
            <p>
              There are no approved rooms to display yet.
              Check back soon or share a property of your own.
            </p>
            <Link to="/register?role=OWNER" className="primary-button">
              List a room <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="featured-grid">
            {rooms.map((room, index) => (
              <article className="room-card" key={room.id}>
                <Link
                  to={`/rooms/${room.id}`}
                  className="room-image-link"
                  aria-label={`View ${room.title}`}
                >
                  <img
                    className="room-card-image"
                    src={getRoomImage(room, index)}
                    alt={room.title || "Available room"}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src =
                        fallbackImages[index % fallbackImages.length];
                    }}
                  />
                  <span className="room-status-badge">
                    <CheckCircle2 size={14} /> Approved listing
                  </span>
                </Link>

                <div className="room-card-body">
                  <div className="room-card-location">
                    <MapPin size={15} />
                    <span>{getRoomLocation(room)}</span>
                  </div>

                  <h3>{room.title || "Comfortable room"}</h3>

                  <div className="room-card-details">
                    <span>
                      <BedDouble size={16} />
                      {room.room_type || "Room"}
                    </span>
                  </div>

                  <div className="room-card-footer">
                    <div className="room-price">
                      <strong>
                        ₹{Number(room.monthly_rent || 0).toLocaleString("en-IN")}
                      </strong>
                      <span>/ month</span>
                    </div>

                    <Link
                      to={`/rooms/${room.id}`}
                      className="room-arrow-button"
                      aria-label={`View details for ${room.title}`}
                    >
                      <ArrowUpRight size={20} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="owner-cta">
        <div className="owner-cta-content">
          <span className="section-eyebrow">FOR PROPERTY OWNERS</span>
          <h2>Have a room to rent?</h2>
          <p>
            Reach people looking for their next home. Submit your room
            details and let our admin review your listing before it goes live.
          </p>
          <Link to="/register?role=OWNER" className="owner-cta-button">
            List your property <ArrowRight size={18} />
          </Link>
        </div>

        <div className="owner-cta-art">
          <div className="cta-art-circle">
            <BedDouble size={74} strokeWidth={1.3} />
          </div>
          <div className="cta-art-small-circle">
            <CheckCircle2 size={29} />
          </div>
          <div className="cta-art-label">
            <ShieldCheck size={18} />
            <span>Reviewed before publishing</span>
          </div>
        </div>
      </section>

      <section className="home-bottom-note">
        <SlidersHorizontal size={18} />
        <p>
          Looking for something specific? Use the rooms page to explore
          listings and narrow down your options.
        </p>
        <Link to="/rooms">Explore rooms <ArrowRight size={16} /></Link>
      </section>
    </div>
  );
}

export default Home;
