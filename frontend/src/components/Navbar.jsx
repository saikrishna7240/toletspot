
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Home, Search, UserRound, PlusCircle, Bell, LayoutDashboard } from "lucide-react";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const role = (
    localStorage.getItem("role") ||
    localStorage.getItem("userRole") ||
    ""
  ).toUpperCase();

 const handleDashboard = () => {
  const token = localStorage.getItem("token");

  const savedUser = localStorage.getItem("user");
  const savedRole = localStorage.getItem("role");

  let role = savedRole;

  // Fallback: read the role from the saved user object
  if (!role && savedUser) {
    try {
      role = JSON.parse(savedUser)?.role;
    } catch {
      role = null;
    }
  }

  role = role?.toUpperCase();

  if (!token) {
    navigate("/login");
    return;
  }

  switch (role) {
    case "TENANT":
      navigate("/tenant");
      break;
    case "OWNER":
      navigate("/owner");
      break;
    case "ADMIN":
      navigate("/admin");
      break;
    default:
      console.error("Unable to identify user role:", role);
      navigate("/login");
  }
};

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-icon">
          <Home size={21} />
        </span>
        <span>
          ToLet<span className="brand-accent">Spot</span>
        </span>
      </Link>

      <nav className="navbar-links">
        <NavLink to="/rooms">
          <Search size={17} />
          Find Rooms
        </NavLink>

        <NavLink to="/register?role=OWNER">
          <PlusCircle size={17} />
          List Your Room
        </NavLink>

        <NavLink to="/notifications" className="navbar-link">
          <Bell size={18} />
          <span>Notifications</span>
        </NavLink>

        <button
          type="button"
          className="navbar-dashboard"
          onClick={handleDashboard}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>
      </nav>

      <div className="navbar-actions">
        {!token ? (
          <>
            <Link to="/login" className="login-link">
              <UserRound size={17} />
              Log in
            </Link>

            <Link to="/register" className="signup-button">
              Get Started
            </Link>
          </>
        ) : (
          <button
            type="button"
            className="login-link navbar-logout"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("role");
              localStorage.removeItem("userRole");
              localStorage.removeItem("user");
              navigate("/login");
            }}
          >
            <UserRound size={17} />
            Log out
          </button>
        )}
      </div>
    </header>
  );
}

export default Navbar;