import { useState } from "react";

export default function FraudWarning({ fraudReport }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!fraudReport || fraudReport.suspicionScore === 0) {
    return null;
  }

  const { riskLevel, suspicionScore, flags, recommendation } = fraudReport;

  // Don't show for low-risk items
  if (riskLevel === "low" && suspicionScore < 20) {
    return null;
  }

  const getWarningStyle = () => {
    switch (riskLevel) {
      case "critical":
        return {
          bg: "bg-danger",
          text: "text-white",
          icon: "🚨",
          border: "border-danger"
        };
      case "high":
        return {
          bg: "bg-warning",
          text: "text-dark",
          icon: "⚠️",
          border: "border-warning"
        };
      case "medium":
        return {
          bg: "bg-warning bg-opacity-25",
          text: "text-dark",
          icon: "⚠️",
          border: "border-warning"
        };
      default:
        return {
          bg: "bg-info bg-opacity-25",
          text: "text-dark",
          icon: "ℹ️",
          border: "border-info"
        };
    }
  };

  const style = getWarningStyle();

  return (
    <div className={`card ${style.bg} border ${style.border} mb-3`}>
      <div className="card-body">
        <div className="d-flex align-items-start gap-3">
          <div style={{ fontSize: "2rem" }}>{style.icon}</div>
          <div className="flex-grow-1">
            <h5 className={`card-title ${style.text} mb-2`}>
              {riskLevel === "critical" && "🚫 SCAM ALERT - DO NOT PURCHASE"}
              {riskLevel === "high" && "⚠️ HIGH RISK - PROCEED WITH EXTREME CAUTION"}
              {riskLevel === "medium" && "⚠️ CAUTION ADVISED"}
              {riskLevel === "low" && "ℹ️ Minor Warning"}
            </h5>
            
            {recommendation?.userWarning && (
              <p className={`${style.text} mb-2`}>
                {recommendation.userWarning}
              </p>
            )}

            <div className={`${style.text} mb-2`}>
              <strong>Risk Score:</strong> {suspicionScore}/100
            </div>

            {/* Show top 3 flags */}
            {flags && flags.length > 0 && (
              <div className="mb-2">
                <strong className={style.text}>Detected Issues:</strong>
                <ul className={`mb-0 mt-1 ${style.text}`}>
                  {flags.slice(0, 3).map((flag, index) => (
                    <li key={index} className="small">
                      {flag.message}
                    </li>
                  ))}
                  {flags.length > 3 && !showDetails && (
                    <li className="small">
                      <button
                        className="btn btn-link btn-sm p-0 text-decoration-underline"
                        onClick={() => setShowDetails(true)}
                      >
                        ...and {flags.length - 3} more issues
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Detailed breakdown */}
            {showDetails && flags && flags.length > 3 && (
              <div className="mt-2">
                <strong className={style.text}>All Issues:</strong>
                <ul className={`mb-0 mt-1 ${style.text}`}>
                  {flags.slice(3).map((flag, index) => (
                    <li key={index} className="small">
                      {flag.message}
                    </li>
                  ))}
                </ul>
                <button
                  className="btn btn-link btn-sm p-0 mt-1 text-decoration-underline"
                  onClick={() => setShowDetails(false)}
                >
                  Show less
                </button>
              </div>
            )}

            {/* Safety tips */}
            {(riskLevel === "high" || riskLevel === "critical") && (
              <div className={`mt-3 p-2 border rounded ${style.text}`}>
                <strong>🛡️ Safety Tips:</strong>
                <ul className="mb-0 mt-1 small">
                  <li>Never send money before seeing the product in person</li>
                  <li>Meet in a public place for the transaction</li>
                  <li>Verify the seller's identity and reviews</li>
                  <li>Don't share personal/banking information</li>
                  <li>If it seems too good to be true, it probably is</li>
                </ul>
              </div>
            )}

            {riskLevel === "critical" && (
              <div className="mt-2">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    // Report functionality
                    alert("This listing has been reported to administrators for review.");
                  }}
                >
                  🚩 Report This Listing
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
