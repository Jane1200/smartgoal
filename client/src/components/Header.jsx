import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import Brand from "@/components/Brand.jsx";

function IconUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3.5 21a8.5 8.5 0 0 1 17 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function Header() {
  const auth = useAuth();
  const user = auth?.user;
  const logout = auth?.logout;
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    fn();
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="container-xxl">
        <div className="header-content">
          {/* Brand */}
          <div className="header-brand">
            <Brand />
          </div>

          {/* Desktop Navigation */}
          <nav className="header-nav d-none d-lg-flex">
            <NavLink to="/" end className="nav-link">Home</NavLink>
            <NavLink to="/about" className="nav-link">About Us</NavLink>
          </nav>

          {/* Right Side Actions */}
          <div className="header-actions">
            {!user?.token ? (
              <Link to="/login" className="action-btn user-btn" aria-label="Login">
                <IconUser />
              </Link>
            ) : (
              <div className="user-menu">
                <button className="action-btn user-btn" aria-label="User Menu">
                  <IconUser />
                </button>
                <div className="user-dropdown">
                  <Link to="/dashboard" className="dropdown-item">Dashboard</Link>
                  <Link to="/profile" className="dropdown-item">Profile</Link>
                  <button 
                    className="dropdown-item text-danger"
                    onClick={() => { logout(); navigate("/login"); }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button 
              className="mobile-menu-btn d-lg-none" 
              aria-label="Menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <IconMenu />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={`mobile-nav ${mobileMenuOpen ? 'is-open' : ''}`}>
          <NavLink to="/" end className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Home</NavLink>
          <NavLink to="/about" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>About Us</NavLink>
        </div>
      </div>
    </header>
  );
}
