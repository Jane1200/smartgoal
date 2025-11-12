import { useState } from "react";
import ConnectionRequests from "@/sections/ConnectionRequests.jsx";
import GeoMatching from "@/sections/GeoMatching.jsx";

export default function Connections() {
  const [activeTab, setActiveTab] = useState('requests');

  return (
    <div className="container-xxl py-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="mb-2">Connections</h2>
        <p className="text-muted">
          Manage your connection requests and find nearby buyers interested in your resale items
        </p>
      </div>

      {/* Tabs */}
      <div className="card mb-4">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'requests' ? 'active' : ''}`}
                onClick={() => setActiveTab('requests')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  <path d="M13 8H7"/>
                  <path d="M17 12H7"/>
                </svg>
                Connection Requests
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'findBuyers' ? 'active' : ''}`}
                onClick={() => setActiveTab('findBuyers')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Find Nearby Buyers
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'requests' && (
        <div>
          <ConnectionRequests />
        </div>
      )}
      
      {activeTab === 'findBuyers' && (
        <div>
          <GeoMatching />
        </div>
      )}
    </div>
  );
}










