import { Link, NavLink, useLocation } from "react-router-dom";
import Brand from "@/components/Brand.jsx";

export default function AuthHeader() {
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  return (
    <header className="site-header is-scrolled">
      <div className="container-xxl">
        <div className="header-content">
          <div className="header-brand">
            <Brand />
          </div>

          <nav className="header-nav d-none d-lg-flex">
            <NavLink to="/" className="nav-link">Home</NavLink>
          </nav>

          <div className="header-actions">
            {isLogin ? (
              <Link to="/register" className="btn btn-dark rounded-pill px-4">Sign up</Link>
            ) : (
              <Link to="/login" className="btn btn-outline-dark rounded-pill px-4">Sign in</Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}



