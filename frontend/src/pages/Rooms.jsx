
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  MapPin,
  BedDouble,
  SlidersHorizontal,
  ArrowUpRight,
  RotateCcw,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import api from "../services/api";
import "./Rooms.css";

const fallbackImages = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=80",
];

function Rooms() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [city, setCity] = useState(searchParams.get("city") || "");
  const [maxRent, setMaxRent] = useState(searchParams.get("maxRent") || "");
  const [roomType, setRoomType] = useState(searchParams.get("roomType") || "");

  useEffect(() => {
    let active = true;

    async function fetchRooms() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/rooms");
        const data = Array.isArray(response.data)
          ? response.data
          : response.data.rooms || response.data.data || [];

        if (active) setRooms(data);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load rooms. Check that your backend is running."
          );
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

  useEffect(() => {
    setCity(searchParams.get("city") || "");
    setMaxRent(searchParams.get("maxRent") || "");
    setRoomType(searchParams.get("roomType") || "");
  }, [searchParams]);

  const filteredRooms = rooms.filter((room) => {
    const location = [room.city, room.state, room.address]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesCity =
      !city.trim() || location.includes(city.trim().toLowerCase());

    const rent = Number(room.monthly_rent || 0);
    const matchesRent = !maxRent || rent <= Number(maxRent);

    const type = String(room.room_type || "").toLowerCase();
    const matchesType =
      !roomType || type === roomType.toLowerCase();

    return matchesCity && matchesRent && matchesType;
  });

  function applyFilters(event) {
    event.preventDefault();

    const params = new URLSearchParams();

    if (city.trim()) params.set("city", city.trim());
    if (maxRent) params.set("maxRent", maxRent);
    if (roomType) params.set("roomType", roomType);

    setSearchParams(params);
  }

  function clearFilters() {
    setCity("");
    setMaxRent("");
    setRoomType("");
    setSearchParams({});
  }

  function getLocation(room) {
    return [room.city, room.state].filter(Boolean).join(", ") ||
      room.address ||
      "Location available on request";
  }

  function getImage(room, index) {
    return room.image_url || fallbackImages[index % fallbackImages.length];
  }

  return (
    <div className="rooms-page">
      <section className="rooms-hero">
        <div className="rooms-hero-content">
          <span className="rooms-eyebrow">
            <CheckCircle2 size={15} />
            FIND YOUR NEXT SPACE
          </span>

          <h1>Explore rooms that feel like home.</h1>

          <p>
            Browse available room listings and discover a place
            that suits your location and budget.
          </p>

          <div className="rooms-hero-stat">
            <div className="rooms-stat-icon">
              <BedDouble size={21} />
            </div>
            <div>
              <strong>{loading ? "..." : filteredRooms.length}</strong>
              <span>
                {filteredRooms.length === 1 ? "room found" : "rooms found"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rooms-main">
        <form className="rooms-filter-panel" onSubmit={applyFilters}>
          <div className="rooms-filter-heading">
            <div className="filter-title">
              <SlidersHorizontal size={20} />
              <h2>Find your room</h2>
            </div>

            <button
              type="button"
              className="clear-filters-button"
              onClick={clearFilters}
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>

          <div className="rooms-filter-fields">
            <label className="rooms-filter-field">
              <span>City or location</span>
              <div className="rooms-filter-input">
                <MapPin size={18} />
                <input
                  type="text"
                  placeholder="e.g. Hyderabad"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
              </div>
            </label>

            <label className="rooms-filter-field">
              <span>Maximum monthly rent</span>
              <div className="rooms-filter-input">
                <Wallet size={18} />
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
              </div>
            </label>

            <label className="rooms-filter-field">
              <span>Room type</span>
              <div className="rooms-filter-input">
                <BedDouble size={18} />
                <select
                  value={roomType}
                  onChange={(event) => setRoomType(event.target.value)}
                >
                  <option value="">All room types</option>
                  <option value="Single">Single</option>
                  <option value="Shared">Shared</option>
                  <option value="Private">Private</option>
                  <option value="1 BHK">1 BHK</option>
                  <option value="2 BHK">2 BHK</option>
                  <option value="3 BHK">3 BHK</option>
                </select>
              </div>
            </label>

            <button className="rooms-search-button" type="submit">
              <Search size={18} />
              Search
            </button>
          </div>
        </form>

        <div className="rooms-results-heading">
          <div>
            <span className="rooms-results-eyebrow">AVAILABLE PROPERTIES</span>
            <h2>Rooms for you</h2>
          </div>
          <span className="rooms-results-count">
            {loading ? "Loading..." : `${filteredRooms.length} results`}
          </span>
        </div>

        {loading ? (
          <div className="rooms-page-state">
            <div className="rooms-spinner" />
            <p>Loading available rooms...</p>
          </div>
        ) : error ? (
          <div className="rooms-page-state">
            <div className="rooms-state-icon">
              <Search size={26} />
            </div>
            <h3>Unable to load rooms</h3>
            <p>{error}</p>
            <button
              className="rooms-reset-button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="rooms-page-state">
            <div className="rooms-state-icon">
              <Search size={27} />
            </div>
            <h3>No matching rooms found</h3>
            <p>
              Try another city, increase your budget, or remove a filter.
            </p>
            <button className="rooms-reset-button" onClick={clearFilters}>
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="rooms-listing-grid">
            {filteredRooms.map((room, index) => (
              <article className="rooms-listing-card" key={room.id}>
                <Link
                  to={`/rooms/${room.id}`}
                  className="rooms-listing-image"
                  aria-label={`View ${room.title}`}
                >
                  <img
                    src={getImage(room, index)}
                    alt={room.title || "Available room"}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src =
                        fallbackImages[index % fallbackImages.length];
                    }}
                  />

                  <span className="rooms-approved-badge">
                    <CheckCircle2 size={13} />
                    Approved
                  </span>
                </Link>

                <div className="rooms-listing-body">
                  <div className="rooms-listing-location">
                    <MapPin size={15} />
                    <span>{getLocation(room)}</span>
                  </div>

                  <h3>{room.title || "Comfortable room"}</h3>

                  <p className="rooms-listing-description">
                    {room.description ||
                      "Contact the property owner for more details about this room."}
                  </p>

                  <div className="rooms-listing-type">
                    <BedDouble size={16} />
                    <span>{room.room_type || "Room"}</span>
                  </div>

                  <div className="rooms-listing-footer">
                    <div className="rooms-listing-price">
                      <strong>
                        ₹{Number(room.monthly_rent || 0).toLocaleString("en-IN")}
                      </strong>
                      <span>/ month</span>
                    </div>

                    <Link
                      to={`/rooms/${room.id}`}
                      className="rooms-view-button"
                    >
                      View details
                      <ArrowUpRight size={17} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Rooms;
