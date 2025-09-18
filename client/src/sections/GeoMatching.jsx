import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api, { getFileUrl } from "@/utils/api.js";

export default function GeoMatching() {
  const [nearbyBuyers, setNearbyBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [geoPreferences, setGeoPreferences] = useState(null);
  const [maxDistance, setMaxDistance] = useState(50);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchUserLocation();
    fetchNearbyBuyers();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      fetchNearbyBuyers(true); // Silent refresh
    }, 30000);

    return () => clearInterval(interval);
  }, [maxDistance]);

  const fetchUserLocation = async () => {
    try {
      const { data } = await api.get("/profile/location");
      setUserLocation(data.location);
      setGeoPreferences(data.geoPreferences);
      setMaxDistance(data.geoPreferences?.maxDistance || 50);
    } catch (error) {
      console.error("Failed to fetch user location:", error);
    }
  };

  const fetchNearbyBuyers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/profile/nearby-buyers?maxDistance=${maxDistance}&limit=50`);
      setNearbyBuyers(data.nearbyBuyers);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch nearby buyers:", error);
      if (!silent) {
        if (error.response?.status === 400) {
          setShowLocationModal(true);
        } else if (error.response?.status === 403) {
          setShowPreferencesModal(true);
        } else {
          toast.error("Failed to fetch nearby buyers");
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }

    setLocationPermission("requesting");
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocoding to get address
          const address = await reverseGeocode(latitude, longitude);
          
          await api.put("/profile/location", {
            latitude,
            longitude,
            ...address
          });
          
          setUserLocation({
            latitude,
            longitude,
            ...address,
            lastUpdated: new Date()
          });
          
          setLocationPermission("granted");
          setShowLocationModal(false);
          toast.success("Location updated successfully!");
          
          // Refresh nearby buyers
          fetchNearbyBuyers();
        } catch (error) {
          console.error("Failed to update location:", error);
          toast.error("Failed to update location");
          setLocationPermission("denied");
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationPermission("denied");
        toast.error("Location access denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      // Using a free geocoding service with fallback
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      
      return {
        address: data.localityInfo?.administrative?.[0]?.name || "",
        city: data.city || data.localityInfo?.administrative?.[1]?.name || "Unknown City",
        state: data.principalSubdivision || data.localityInfo?.administrative?.[2]?.name || "Unknown State",
        country: data.countryName || "India",
        postalCode: data.postcode || ""
      };
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      // Fallback to basic location data
      return {
        address: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        city: "Unknown City",
        state: "Unknown State", 
        country: "India",
        postalCode: ""
      };
    }
  };

  const updateGeoPreferences = async (preferences) => {
    try {
      await api.put("/profile/geo-preferences", preferences);
      setGeoPreferences(preferences);
      setMaxDistance(preferences.maxDistance);
      setShowPreferencesModal(false);
      toast.success("Geo preferences updated successfully!");
      
      // Refresh nearby buyers with new preferences
      fetchNearbyBuyers();
    } catch (error) {
      console.error("Failed to update geo preferences:", error);
      toast.error("Failed to update geo preferences");
    }
  };

  const connectWithBuyer = async (buyerId, buyerName) => {
    try {
      const response = await api.post("/connections/send-request", {
        targetUserId: buyerId,
        message: `Hi ${buyerName}! I'd like to connect with you to discuss my resale items.`,
        connectionType: 'marketplace'
      });
      
      toast.success(`Connection request sent to ${buyerName}!`);
      console.log("Connection request sent:", response.data);
      
      // Refresh nearby buyers to show updated status
      fetchNearbyBuyers();
    } catch (error) {
      console.error("Failed to connect with buyer:", error);
      if (error.response?.status === 400 && error.response?.data?.message?.includes("already exists")) {
        toast.info("Connection request already sent to this buyer");
      } else {
        toast.error(`Failed to send connection request: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDistanceColor = (distance) => {
    if (distance <= 5) return 'text-success';
    if (distance <= 15) return 'text-warning';
    return 'text-info';
  };

  const getDistanceIcon = (distance) => {
    if (distance <= 5) return '📍'; // Very close
    if (distance <= 15) return '🏠'; // Close
    if (distance <= 30) return '🚗'; // Moderate distance
    return '🗺️'; // Far
  };

  if (loading) {
    return (
      <div className="container-xxl py-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xxl py-4 geo-matching">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Find Nearby Buyers</h2>
          <p className="text-muted mb-0">
            Connect with buyers in your area for resale items • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="badge bg-success">Live Location</div>
          <div className="badge bg-info">Auto Refresh</div>
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={() => fetchNearbyBuyers()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Location Status */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">Your Location</h6>
            </div>
            <div className="card-body">
              {userLocation ? (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-semibold">
                      📍 {userLocation.city}, {userLocation.state}
                    </span>
                    <button 
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => setShowLocationModal(true)}
                    >
                      Update
                    </button>
                  </div>
                  <small className="text-muted">
                    Last updated: {formatDate(userLocation.lastUpdated)}
                  </small>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-muted mb-3">Location not set</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowLocationModal(true)}
                  >
                    Set Location
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">Search Preferences</h6>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-semibold">
                  Max Distance: {maxDistance} km
                </span>
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShowPreferencesModal(true)}
                >
                  Settings
                </button>
              </div>
              <small className="text-muted">
                Location sharing: {geoPreferences?.allowLocationSharing ? 'Enabled' : 'Disabled'}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Nearby Buyers */}
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="card-title mb-0">Nearby Buyers ({nearbyBuyers.length})</h6>
            <div className="d-flex gap-2">
              <select 
                className="form-select form-select-sm" 
                style={{width: 'auto'}}
                value={maxDistance}
                onChange={(e) => setMaxDistance(parseInt(e.target.value))}
              >
                <option value={10}>Within 10 km</option>
                <option value={25}>Within 25 km</option>
                <option value={50}>Within 50 km</option>
                <option value={100}>Within 100 km</option>
              </select>
            </div>
          </div>
        </div>
        <div className="card-body">
          {nearbyBuyers.length === 0 ? (
            <div className="text-center py-5">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted mb-3">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <h5 className="text-muted">No buyers found nearby</h5>
              <p className="text-muted">
                Try increasing your search distance or check if location sharing is enabled.
              </p>
            </div>
          ) : (
            <div className="row g-3">
              {nearbyBuyers.map((buyer) => (
                <div key={buyer.id} className="col-md-6 col-lg-4">
                  <div className="card h-100">
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-3">
                        <div className="avatar me-3">
                          {buyer.avatar ? (
                            <img 
                              src={getFileUrl(buyer.avatar)} 
                              alt={buyer.name}
                              className="rounded-circle"
                              style={{width: '40px', height: '40px', objectFit: 'cover'}}
                            />
                          ) : (
                            <div 
                              className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white"
                              style={{width: '40px', height: '40px'}}
                            >
                              {buyer.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-0">{buyer.name}</h6>
                          <small className="text-muted">{buyer.email}</small>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="d-flex align-items-center mb-1">
                          <span className="me-2">{getDistanceIcon(buyer.distance)}</span>
                          <span className={`fw-semibold ${getDistanceColor(buyer.distance)}`}>
                            {buyer.distance} km away
                          </span>
                        </div>
                        <small className="text-muted">
                          📍 {buyer.location.city}, {buyer.location.state}
                        </small>
                      </div>
                      
                      <div className="mb-3">
                        <small className="text-muted">
                          Joined: {formatDate(buyer.joinedDate)}
                        </small>
                      </div>
                      
                      <button 
                        className="btn btn-primary w-100"
                        onClick={() => connectWithBuyer(buyer.id, buyer.name)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        Connect
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Location</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowLocationModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>To find nearby buyers, we need to access your location. This helps us connect you with buyers in your area.</p>
                <div className="text-center">
                  <button 
                    className="btn btn-primary"
                    onClick={requestLocationPermission}
                    disabled={locationPermission === "requesting"}
                  >
                    {locationPermission === "requesting" ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        Allow Location Access
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Geo Preferences</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowPreferencesModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Maximum Search Distance (km)</label>
                  <input 
                    type="number" 
                    className="form-control"
                    min="1"
                    max="500"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                  />
                </div>
                <div className="form-check mb-3">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="allowLocationSharing"
                    checked={geoPreferences?.allowLocationSharing || false}
                    onChange={(e) => setGeoPreferences({
                      ...geoPreferences,
                      allowLocationSharing: e.target.checked
                    })}
                  />
                  <label className="form-check-label" htmlFor="allowLocationSharing">
                    Allow location sharing with other users
                  </label>
                </div>
                <div className="form-check mb-3">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="showExactLocation"
                    checked={geoPreferences?.showExactLocation || false}
                    onChange={(e) => setGeoPreferences({
                      ...geoPreferences,
                      showExactLocation: e.target.checked
                    })}
                  />
                  <label className="form-check-label" htmlFor="showExactLocation">
                    Show exact coordinates to other users
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowPreferencesModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => updateGeoPreferences(geoPreferences)}
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}