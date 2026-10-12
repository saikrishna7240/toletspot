
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail, ArrowRight } from "lucide-react";
import api from "../services/api";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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
      const response = await api.post("/auth/login", formData);
      const data = response.data;

      const token = data.token || data.accessToken;
      const user = data.user;

      if (!token) {
        throw new Error("Login succeeded, but no authentication token was returned.");
      }

      localStorage.setItem("token", token);

      if (user) {
  localStorage.setItem("user", JSON.stringify(user));

  if (user.role) {
    localStorage.setItem("role", user.role.toUpperCase());
  }
}

      if (user?.role === "ADMIN") {
        navigate("/admin");
      } else if (user?.role === "OWNER") {
        navigate("/owner");
      } else {
        navigate("/rooms");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to log in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="login-page">
      <div className="login-card">
        <div className="login-brand-icon">
          <LockKeyhole size={26} />
        </div>

        <span className="login-eyebrow">WELCOME BACK</span>
        <h1>Login to ToLetSpot</h1>
        <p className="login-subtitle">
          Sign in to discover rooms or manage your property listings.
        </p>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email address</label>
          <div className="login-input-wrap">
            <Mail size={19} />
            <input
              id="login-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <label htmlFor="login-password">Password</label>
          <div className="login-input-wrap">
            <LockKeyhole size={19} />
            <input
              id="login-password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </div>

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="login-register-link">
          Don't have an account? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </section>
  );
}

export default Login;
