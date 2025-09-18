export default function QuickActions() {
  return (
    <div className="quick-actions position-fixed" style={{ right: 24, bottom: 24, zIndex: 1040 }}>
      <div className="d-flex flex-column gap-2">
        <button className="btn btn-primary rounded-pill d-flex align-items-center gap-2" onClick={() => alert("Support - coming soon")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18v-1a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Support
        </button>
        <button className="btn btn-outline-secondary rounded-pill d-flex align-items-center gap-2" onClick={() => alert("Help - coming soon")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"/>
            <line x1="12" y1="17" x2="12" y2="17"/>
          </svg>
          Help
        </button>
      </div>
    </div>
  );
}


