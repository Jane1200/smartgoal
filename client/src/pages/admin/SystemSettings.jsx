import { useState, useEffect } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

export default function SystemSettings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get("/system-settings");
      setSettings(data.settings || []);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key, currentValue) => {
    try {
      await api.put(`/system-settings/${key}`, {
        value: !currentValue,
        category: settings.find(s => s.key === key)?.category
      });
      toast.success("Setting updated successfully");
      fetchSettings();
    } catch (error) {
      console.error("Failed to update setting:", error);
      toast.error("Failed to update setting");
    }
  };

  const initializeDefaults = async () => {
    try {
      await api.post("/system-settings/initialize");
      toast.success("Default settings initialized");
      fetchSettings();
    } catch (error) {
      console.error("Failed to initialize:", error);
      toast.error("Failed to initialize settings");
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: "1400px" }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1 fw-bold">System Settings</h2>
          <p className="text-muted mb-0">Configure application settings</p>
        </div>
        {settings.length === 0 && (
          <button className="btn btn-primary" onClick={initializeDefaults}>
            Initialize Default Settings
          </button>
        )}
      </div>

      {settings.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <p className="text-muted">No settings configured. Click "Initialize Default Settings" to get started.</p>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {["general", "features", "notifications", "marketplace", "security"].map((category) => {
            const categorySettings = settings.filter(s => s.category === category);
            if (categorySettings.length === 0) return null;

            return (
              <div key={category} className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-bottom">
                    <h6 className="mb-0 fw-semibold text-capitalize">{category}</h6>
                  </div>
                  <div className="card-body">
                    {categorySettings.map((setting) => (
                      <div key={setting._id} className="d-flex justify-content-between align-items-center py-3 border-bottom">
                        <div className="flex-grow-1">
                          <div className="fw-medium">{setting.key.replace(/_/g, " ").toUpperCase()}</div>
                          {setting.description && (
                            <div className="small text-muted">{setting.description}</div>
                          )}
                        </div>
                        <div>
                          {typeof setting.value === "boolean" ? (
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={setting.value}
                                onChange={() => handleToggle(setting.key, setting.value)}
                              />
                            </div>
                          ) : (
                            <span className="badge bg-secondary">{setting.value}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
