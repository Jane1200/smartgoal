import { useEffect, useState } from "react";
import api from "@/utils/api.js";

export default function MarketplacePreview() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketplaceItems();
  }, []);

  const fetchMarketplaceItems = async () => {
    try {
      const { data } = await api.get("/marketplace/featured?limit=4");
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch marketplace items:", error);
      // Fallback to empty array if API fails
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="row g-3">
        {[...Array(4)].map((_, i) => (
          <div className="col-6 col-md-3" key={i}>
            <div className="card-like overflow-hidden h-100">
              <div className="ratio ratio-4x3 bg-light d-flex align-items-center justify-content-center">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
              <div className="p-3 d-grid gap-1">
                <div className="placeholder-glow">
                  <span className="placeholder col-8"></span>
                </div>
                <div className="placeholder-glow">
                  <span className="placeholder col-6"></span>
                </div>
                <button className="btn btn-sm btn-outline-light mt-1" disabled>
                  Loading...
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="row g-3">
        <div className="col-12">
          <div className="text-center py-5">
            <div className="text-muted">No featured items available at the moment.</div>
            <a href="/marketplace" className="btn btn-primary mt-3">Browse Marketplace</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="row g-3">
      {items.map(item => (
        <div className="col-6 col-md-3" key={item._id || item.id}>
          <div className="card-like overflow-hidden h-100">
            <div className="ratio ratio-4x3">
              <img 
                src={
                  item.images?.[0]?.url || 
                  item.image || 
                  item.img || 
                  "https://via.placeholder.com/300x200?text=No+Image"
                } 
                alt={item.title || item.name} 
                className="img-cover" 
              />
            </div>
            <div className="p-3 d-grid gap-1">
              <div className="fw-medium">{item.title || item.name}</div>
              <div className="text-success">₹{item.price?.toLocaleString() || item.amount?.toLocaleString() || '0'}</div>
              <a href="/marketplace" className="btn btn-sm btn-outline-light mt-1">View</a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
  