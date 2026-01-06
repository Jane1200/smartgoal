import { useState, useEffect } from 'react';

const conditionData = {
  'like-new': {
    emoji: '😍',
    label: 'Like New',
    color: '#5B5FED',
    description: [
      'Pristine condition, appears brand new',
      'No visible wear or defects',
      'Ideal for users seeking a premium, untouched device'
    ],
    icon: (
      <svg className="device-icon" width="80" height="160" viewBox="0 0 80 160">
        <rect x="10" y="10" width="60" height="140" rx="8" fill="#2d3748" stroke="#4a5568" strokeWidth="2"/>
        <circle cx="40" cy="25" r="3" fill="#4299e1"/>
        <rect x="20" y="35" width="40" height="70" rx="4" fill="#1a202c"/>
        {/* Sparkle icons */}
        <text x="30" y="70" fontSize="20" fill="#FFD700">✨</text>
        <text x="25" y="80" fontSize="16" fill="#FFD700">✨</text>
      </svg>
    )
  },
  'excellent': {
    emoji: '😊',
    label: 'Excellent',
    color: '#38A169',
    description: [
      'Near-perfect condition with minimal wear',
      'Functions flawlessly',
      'Well-maintained and looks almost new'
    ],
    icon: (
      <svg className="device-icon" width="80" height="160" viewBox="0 0 80 160">
        <rect x="10" y="10" width="60" height="140" rx="8" fill="#2d3748" stroke="#4a5568" strokeWidth="2"/>
        <circle cx="40" cy="25" r="3" fill="#48bb78"/>
        <rect x="20" y="35" width="40" height="70" rx="4" fill="#1a202c"/>
        <circle cx="40" cy="70" r="2" fill="#48bb78"/>
      </svg>
    )
  },
  'good': {
    emoji: '😐',
    label: 'Good',
    color: '#F6AD55',
    description: [
      'Decent condition with minor wear',
      'Functions well without major issues',
      'Slight cosmetic imperfections possible'
    ],
    icon: (
      <svg className="device-icon" width="80" height="160" viewBox="0 0 80 160">
        <rect x="10" y="10" width="60" height="140" rx="8" fill="#2d3748" stroke="#4a5568" strokeWidth="2"/>
        <circle cx="40" cy="25" r="3" fill="#f6ad55"/>
        <rect x="20" y="35" width="40" height="70" rx="4" fill="#1a202c"/>
        {/* Small scratch */}
        <line x1="65" y1="45" x2="70" y2="50" stroke="#718096" strokeWidth="1.5"/>
      </svg>
    )
  },
  'fair': {
    emoji: '😕',
    label: 'Fair',
    color: '#ED8936',
    description: [
      'Acceptable condition with wear and tear',
      'May have minor cosmetic flaws',
      'Suitable for budget conscious buyers'
    ],
    icon: (
      <svg className="device-icon" width="80" height="160" viewBox="0 0 80 160">
        <rect x="10" y="10" width="60" height="140" rx="8" fill="#2d3748" stroke="#4a5568" strokeWidth="2"/>
        <circle cx="40" cy="25" r="3" fill="#ed8936"/>
        <rect x="20" y="35" width="40" height="70" rx="4" fill="#1a202c"/>
        {/* Multiple scratches */}
        <line x1="65" y1="45" x2="70" y2="50" stroke="#718096" strokeWidth="2"/>
        <line x1="12" y1="120" x2="18" y2="125" stroke="#718096" strokeWidth="2"/>
        <line x1="62" y1="130" x2="67" y2="135" stroke="#718096" strokeWidth="1.5"/>
      </svg>
    )
  },
  'needs-repair': {
    emoji: '🔧',
    label: 'Needs Repair',
    color: '#E53E3E',
    description: [
      'Requires repair work',
      'May have visible issues or defects',
      'Ideal for buyers willing to invest in repairs'
    ],
    icon: (
      <svg className="device-icon" width="80" height="160" viewBox="0 0 80 160">
        <rect x="10" y="10" width="60" height="140" rx="8" fill="#2d3748" stroke="#4a5568" strokeWidth="2"/>
        <circle cx="40" cy="25" r="3" fill="#e53e3e"/>
        <rect x="20" y="35" width="40" height="70" rx="4" fill="#1a202c"/>
        {/* Crack pattern */}
        <path d="M 25 50 L 35 65 L 30 75 L 45 85" stroke="#e53e3e" strokeWidth="2" fill="none"/>
        <path d="M 50 55 L 55 70 L 50 80" stroke="#e53e3e" strokeWidth="1.5" fill="none"/>
      </svg>
    )
  }
};

export default function ConditionExplainer({ selectedCondition, onSelectCondition, deviceType = 'phone', aiDetectedCondition, conditionConfidence }) {
  const [expandedCard, setExpandedCard] = useState(null);

  // Auto-select AI detected condition
  useEffect(() => {
    if (aiDetectedCondition && !selectedCondition && onSelectCondition) {
      onSelectCondition(aiDetectedCondition);
    }
  }, [aiDetectedCondition, selectedCondition, onSelectCondition]);

  // Only show for electronics
  const shouldShow = ['phone', 'smartwatch', 'earphones', 'electronics'].includes(deviceType?.toLowerCase());

  if (!shouldShow) {
    return null;
  }

  const getDeviceTypeLabel = () => {
    switch (deviceType?.toLowerCase()) {
      case 'phone':
        return 'Phone';
      case 'smartwatch':
        return 'Smartwatch';
      case 'earphones':
        return 'Earphones';
      default:
        return 'Device';
    }
  };

  return (
    <div className="condition-explainer-container my-4">
      <style>{`
        .condition-explainer-container {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .ai-detection-banner {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .ai-icon {
          font-size: 2rem;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .ai-detection-content h4 {
          margin: 0 0 0.25rem 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .ai-detection-content p {
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.95;
        }

        .confidence-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-left: auto;
          backdrop-filter: blur(10px);
        }

        .condition-explainer-title {
          text-align: center;
          font-size: 1.75rem;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 0.5rem;
        }

        .condition-explainer-subtitle {
          text-align: center;
          color: #718096;
          margin-bottom: 2rem;
          font-size: 0.95rem;
        }

        .condition-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .condition-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 3px solid transparent;
          position: relative;
          overflow: hidden;
        }

        .condition-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--card-color), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .condition-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }

        .condition-card:hover::before {
          opacity: 1;
        }

        .condition-card.selected {
          border-color: var(--card-color);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
          transform: scale(1.02);
        }

        .condition-card.selected::before {
          opacity: 1;
          height: 8px;
        }

        .condition-card.ai-detected {
          background: linear-gradient(135deg, #f0f4ff 0%, #e6edff 100%);
          border-color: #667eea;
        }

        .ai-badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .condition-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .condition-emoji {
          font-size: 2rem;
          line-height: 1;
        }

        .condition-check {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid #cbd5e0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }

        .condition-card.selected .condition-check {
          background: var(--card-color);
          border-color: var(--card-color);
        }

        .condition-check svg {
          opacity: 0;
          transition: opacity 0.3s;
        }

        .condition-card.selected .condition-check svg {
          opacity: 1;
        }

        .condition-icon-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 120px;
          margin: 1rem 0;
        }

        .device-icon {
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
        }

        .condition-label {
          font-size: 1.1rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 0.75rem;
          text-align: center;
        }

        .condition-description {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 0.85rem;
          color: #4a5568;
        }

        .condition-description li {
          padding: 0.4rem 0;
          padding-left: 1.5rem;
        }
      `}</style>

      {/* AI Detection Banner */}
      {aiDetectedCondition && (
        <div className="ai-detection-banner">
          <div className="ai-icon">🤖</div>
          <div className="ai-detection-content">
            <h4>AI Detected Condition</h4>
            <p>
              Our AI analyzed your image and detected the condition as <strong>{conditionData[aiDetectedCondition]?.label}</strong>
            </p>
          </div>
          {conditionConfidence && (
            <div className="confidence-badge">
              {conditionConfidence}% Confidence
            </div>
          )}
        </div>
      )}

      <h2 className="condition-explainer-title">
        {aiDetectedCondition ? 'AI Detected Condition' : 'Conditions Explained'}
      </h2>
      <p className="condition-explainer-subtitle">
        {aiDetectedCondition 
          ? `AI has automatically detected your ${getDeviceTypeLabel().toLowerCase()}'s condition based on image analysis`
          : `Select the condition that best describes your ${getDeviceTypeLabel().toLowerCase()}`
        }
      </p>

      <div className="condition-cards-grid">
        {Object.entries(conditionData).map(([value, data]) => (
          <div
            key={value}
            className={`condition-card ${selectedCondition === value ? 'selected' : ''} ${aiDetectedCondition === value ? 'ai-detected' : ''}`}
            style={{ '--card-color': data.color }}
            onClick={() => onSelectCondition(value)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectCondition(value);
              }
            }}
          >
            <div className="condition-card-header">
              <span className="condition-emoji">{data.emoji}</span>
              {aiDetectedCondition === value && (
                <div className="ai-badge">
                  🤖 AI Detected
                </div>
              )}
              <div className="condition-check">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>

            <div className="condition-icon-container">
              {data.icon}
            </div>

            <div className="condition-label">{data.label}</div>

            <ul className="condition-description">
              {data.description.map((desc, idx) => (
                <li key={idx}>{desc}</li>
              ))}
            </ul>

            {selectedCondition === value && (
              <div className="text-center">
                <span className="condition-badge">Current Selection</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}












