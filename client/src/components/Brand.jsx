import { Link } from "react-router-dom";

export default function Brand() {
  return (
    <Link to="/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="brand-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <span className="brand-text">SmartGoal</span>
    </Link>
  );
}