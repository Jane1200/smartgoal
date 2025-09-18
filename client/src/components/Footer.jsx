import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="container-xxl">
          <div className="footer-content">
            {/* Brand Section */}
            <div className="footer-brand">
              <div className="footer-logo d-flex align-items-center gap-2">
                <img
                  src="/logo.svg" // ✅ put your logo file in /public (rename to logo.svg or logo.png)
                  alt="SmartGoal Logo"
                  width="32"
                  height="32"
                />
                <span className="logo-text">SmartGoal</span>
              </div>
              <p className="footer-description">
                Transform your dreams into achievable goals. Plan, track, and
                turn unused items into income through local resale.
              </p>
              <div className="social-links">
                <a href="#" className="social-link" aria-label="Twitter">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>
                <a href="#" className="social-link" aria-label="LinkedIn">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a href="#" className="social-link" aria-label="Instagram">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.718-1.297c-.875.807-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297c-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="footer-links">
              <h6 className="footer-title">Quick Links</h6>
              <ul className="footer-list">
                <li>
                  <Link to="/" className="footer-link">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="footer-link">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/wishlist" className="footer-link">
                    Wishlist
                  </Link>
                </li>
                <li>
                  <Link to="/marketplace" className="footer-link">
                    Marketplace
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="footer-link">
                    About Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Features */}
            <div className="footer-links">
              <h6 className="footer-title">Features</h6>
              <ul className="footer-list">
                <li>
                  <Link to="/goals" className="footer-link">
                    Goal Planning
                  </Link>
                </li>
                <li>
                  <Link to="/tracking" className="footer-link">
                    Progress Tracking
                  </Link>
                </li>
                <li>
                  <Link to="/resale" className="footer-link">
                    Resale Platform
                  </Link>
                </li>
                <li>
                  <Link to="/analytics" className="footer-link">
                    Analytics
                  </Link>
                </li>
                <li>
                  <Link to="/community" className="footer-link">
                    Community
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div className="footer-links">
              <h6 className="footer-title">Contact & Support</h6>
              <ul className="footer-list">
                <li className="contact-item">
                  <span>📧 support@smartgoal.app</span>
                </li>
                <li className="contact-item">
                  <span>📍 India</span>
                </li>
                <li className="contact-item">
                  <span>📞 +91 98765 43210</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <div className="container-xxl">
          <div className="footer-bottom-content">
            <div className="copyright">
              <span>&copy; {year} SmartGoal. All Rights Reserved</span>
            </div>
            <div className="legal-links">
              <Link to="/privacy" className="legal-link">
                Privacy Policy
              </Link>
              <Link to="/terms" className="legal-link">
                Terms of Service
              </Link>
              <Link to="/refund" className="legal-link">
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
