export default function TrustBadge({ level = "new", rating = 0, reviewCount = 0, compact = false }) {
  const getBadgeIcon = () => {
    switch (level) {
      case "platinum":
        return "🏆";
      case "gold":
        return "⭐";
      case "silver":
        return "✓";
      case "trusted":
        return "✓";
      case "verified":
        return "✓";
      default:
        return "○";
    }
  };

  const getBadgeColor = () => {
    switch (level) {
      case "platinum":
        return "#FFD700"; // Gold
      case "gold":
        return "#FF6B35"; // Orange
      case "silver":
        return "#C0C0C0"; // Silver
      case "trusted":
        return "#4285F4"; // Blue
      case "verified":
        return "#34A853"; // Green
      default:
        return "#9E9E9E"; // Gray
    }
  };

  const getLevelLabel = () => {
    const labels = {
      platinum: "Platinum Seller",
      gold: "Gold Seller",
      silver: "Silver Seller",
      trusted: "Trusted Seller",
      verified: "Verified Seller",
      new: "New Seller"
    };
    return labels[level] || "New Seller";
  };

  if (compact) {
    return (
      <div className="d-flex align-items-center gap-2">
        <span style={{ fontSize: "1.2rem" }}>{getBadgeIcon()}</span>
        <div className="small">
          <div style={{ color: getBadgeColor(), fontWeight: "bold" }}>
            {getLevelLabel()}
          </div>
          {rating > 0 && (
            <div className="text-muted">
              {rating.toFixed(1)} ★ ({reviewCount} reviews)
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="trust-badge p-2 rounded" style={{ backgroundColor: `${getBadgeColor()}20` }}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="d-flex align-items-center gap-2">
          <span style={{ fontSize: "1.5rem" }}>{getBadgeIcon()}</span>
          <div>
            <div style={{ color: getBadgeColor(), fontWeight: "bold", fontSize: "0.9rem" }}>
              {getLevelLabel()}
            </div>
          </div>
        </div>
      </div>
      {rating > 0 && (
        <div className="small text-muted">
          <div>Rating: {rating.toFixed(1)} ⭐</div>
          <div>Reviews: {reviewCount}</div>
        </div>
      )}
    </div>
  );
}