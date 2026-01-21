import { useState, useEffect } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

export default function ContentModeration() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlaggedContent();
  }, []);

  const fetchFlaggedContent = async () => {
    try {
      // Fetch marketplace items that might need moderation
      const { data } = await api.get("/admin/marketplace/listings", {
        params: { status: "active", limit: 50 }
      });
      setItems(data.listings || []);
    } catch (error) {
      console.error("Failed to fetch content:", error);
      toast.error("Failed to load content");
    } finally {
      setLoading(false);
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
      <div className="mb-4">
        <h2 className="mb-1 fw-bold">Content Moderation</h2>
        <p className="text-muted mb-0">Review and moderate marketplace listings</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="row g-4">
            {items.length === 0 ? (
              <div className="col-12 text-center py-5 text-muted">
                <p>No content to moderate</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="col-md-6 col-lg-4">
                  <div className="card h-100">
                    {item.images && item.images[0] && (
                      <img 
                        src={`http://localhost:5000${item.images[0]}`}
                        className="card-img-top"
                        alt={item.title}
                        style={{ height: "200px", objectFit: "cover" }}
                      />
                    )}
                    <div className="card-body">
                      <h6 className="card-title">{item.title}</h6>
                      <p className="card-text small text-muted text-truncate">
                        {item.description}
                      </p>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold">₹{item.price?.toLocaleString()}</span>
                        <span className="badge bg-success">{item.status}</span>
                      </div>
                      <div className="mt-2 small text-muted">
                        Seller: {item.seller?.name}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
