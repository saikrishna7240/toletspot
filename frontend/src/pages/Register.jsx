
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  UserRound,
  Mail,
  Phone,
  LockKeyhole,
  ArrowRight,
} from "lucide-react";
import api from "../services/api";
import "./Register.css";

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestedRole = searchParams.get("role");
  const initialRole = requestedRole === "OWNER" ? "OWNER" : "TENANT";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: initialRole,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/register", formData);
      const data = response.data;

      if (data.token || data.accessToken) {
        localStorage.setItem("token", data.token || data.accessToken);

        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        navigate(formData.role === "OWNER" ? "/owner" : "/rooms");
      } else {
        navigate("/login", {
          state: { message: "Registration successful. Please log in." },
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create your account. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="register-page">
      <div className="register-card">
        <div className="register-brand-icon">
          <UserRound size={27} />
        </div>

        <span className="register-eyebrow">JOIN TOLETSPOT</span>
        <h1>Create your account</h1>
        <p className="register-subtitle">
          Join ToLetSpot to find a room or list a property for rent.
        </p>

        {error && <div className="register-error">{error}</div>}

        <form className="register-form" onSubmit={handleSubmit}>
          <label htmlFor="register-name">Full name</label>
          <div className="register-input-wrap">
            <UserRound size={18} />
            <input
              id="register-name"
              name="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              autoComplete="name"
              required
            />
          </div>

          <label htmlFor="register-email">Email address</label>
          <div className="register-input-wrap">
            <Mail size={18} />
            <input
              id="register-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <label htmlFor="register-phone">Phone number</label>
          <div className="register-input-wrap">
            <Phone size={18} />
            <input
              id="register-phone"
              name="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={handleChange}
              autoComplete="tel"
              required
            />
          </div>

          <label htmlFor="register-password">Password</label>
          <div className="register-input-wrap">
            <LockKeyhole size={18} />
            <input
              id="register-password"
              name="password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <label htmlFor="register-role">I want to</label>
          <select
            id="register-role"
            className="register-role-select"
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="TENANT">Find and book a room</option>
            <option value="OWNER">List my property</option>
          </select>

          <button
            className="register-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="register-login-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </section>
  );
}

export default Register;
