import { useEffect, useMemo, useState } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import WishlistScraper from "@/components/WishlistScraper.jsx";
import { validateForm, validationRules, formatCurrency } from "@/utils/validations.js";
import { FormError } from "@/components/FormError.jsx";

const emptyForm = {
  title: "",
  description: "",
  url: "",
  price: "",
  currency: "INR",
  priority: "medium",
  category: "",
  imageUrl: "",
  notes: "",
};

export default function WishlistManager() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  const isEdit = useMemo(() => Boolean(editingId), [editingId]);

  async function loadWishlist() {
    setLoading(true);
    try {
      const { data } = await api.get("/wishlist");
      setWishlist(data);
    } catch (error) {
      console.error("Failed to load wishlist:", error);
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWishlist();
  }, []);

  const handleItemAdded = (newItem) => {
    setWishlist(prev => [...prev, newItem]);
  };

  function startEdit(item) {
    setEditingId(item._id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      url: item.url || "",
      price: item.price ?? "",
      currency: item.currency || "INR",
      priority: item.priority || "medium",
      category: item.category || "",
      imageUrl: item.imageUrl || "",
      notes: item.notes || "",
    });
  }

  async function saveItem(e) {
    e.preventDefault();
    
    // Validate wishlist form
    const wishlistValidation = validateForm(form, {
      title: validationRules.wishlist.itemName,
      description: { maxLength: 500, message: "Description cannot exceed 500 characters" },
      url: validationRules.wishlist.url,
      price: validationRules.wishlist.estimatedPrice,
      priority: validationRules.wishlist.priority,
      notes: validationRules.wishlist.notes
    });

    if (!wishlistValidation.isValid) {
      setFormErrors(wishlistValidation.errors);
      toast.error("Please fix the validation errors");
      return;
    }

    setFormErrors({});
    setSaving(true);
    
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        url: form.url.trim() || undefined,
        price: form.price === "" ? undefined : Number(form.price),
        currency: form.currency,
        priority: form.priority,
        category: form.category.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      if (isEdit) {
        const { data } = await api.put(`/wishlist/${editingId}`, payload);
        setWishlist((prev) => prev.map((item) => (item._id === editingId ? data : item)));
        toast.success("Wishlist item updated successfully");
      } else {
        const { data } = await api.post("/wishlist", payload);
        setWishlist((prev) => [data, ...prev]);
        toast.success("Wishlist item added successfully");
      }
      startCreate();
    } catch (error) {
      console.error("Failed to save wishlist item:", error);
      toast.error("Failed to save wishlist item");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id) {
    if (!window.confirm("Are you sure you want to delete this wishlist item?")) {
      return;
    }
    
    try {
      await api.delete(`/wishlist/${id}`);
      setWishlist((prev) => prev.filter((item) => item._id !== id));
      toast.success("Wishlist item deleted successfully");
    } catch (error) {
      console.error("Failed to delete wishlist item:", error);
      toast.error("Failed to delete wishlist item");
    }
  }

  async function markAsPurchased(id) {
    try {
      const { data } = await api.patch(`/wishlist/${id}/purchase`);
      setWishlist((prev) => prev.map((item) => (item._id === id ? data : item)));
      toast.success("Marked as purchased!");
    } catch (error) {
      console.error("Failed to mark as purchased:", error);
      toast.error("Failed to mark as purchased");
    }
  }

  // Get priority badge color
  function getPriorityBadgeClass(priority) {
    switch (priority) {
      case "high": return "bg-danger";
      case "medium": return "bg-warning";
      case "low": return "bg-success";
      default: return "bg-secondary";
    }
  }

  // Get currency symbol
  function getCurrencySymbol(currency) {
    switch (currency) {
      case "INR": return "₹";
      default: return "₹";
    }
  }

  return (
    <div className="row g-4">
      <div className="col-12 col-lg-5">
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex align-items-center gap-2 mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              <h5 className="card-title mb-0">{isEdit ? "Edit Wishlist Item" : "Add Product from URL"}</h5>
            </div>

            {!isEdit && (
              <div className="mb-4">
                <WishlistScraper onItemAdded={handleItemAdded} />
              </div>
            )}
            
            {isEdit && (
              <form className="d-grid gap-3" onSubmit={saveItem}>
              <div>
                <label className="form-label fw-semibold small">Item Title *</label>
                <input
                  className="form-control"
                  placeholder="e.g., iPhone 15 Pro"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="form-label fw-semibold small">Description</label>
                <textarea
                  className="form-control"
                  placeholder="Describe the item..."
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label fw-semibold small">Product URL</label>
                <input
                  className={`form-control ${formErrors.url ? 'is-invalid' : ''}`}
                  type="url"
                  placeholder="https://example.com/product"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                />
                <FormError error={formErrors.url} />
              </div>
              
              <div className="row g-2">
                <div className="col-8">
                  <label className="form-label fw-semibold small">Price</label>
                  <div className="input-group">
                    <select 
                      className="form-select" 
                      style={{ maxWidth: "80px" }}
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    >
                      <option value="INR">₹</option>
                    </select>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                    />
                  </div>
                </div>
                <div className="col-4">
                  <label className="form-label fw-semibold small">Priority</label>
                  <select
                    className="form-select"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="row g-2">
                <div className="col">
                  <label className="form-label fw-semibold small">Category</label>
                  <input
                    className="form-control"
                    placeholder="e.g., Electronics, Books, Clothing"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
                <div className="col">
                  <label className="form-label fw-semibold small">Image URL</label>
                  <input
                    className="form-control"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label fw-semibold small">Notes</label>
                <textarea
                  className="form-control"
                  placeholder="Additional notes..."
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              
              <div className="d-flex gap-2 pt-2">
                <button className="btn btn-primary flex-grow-1" disabled={saving} type="submit">
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>
                      </svg>
                      {isEdit ? "Update Item" : "Add to Wishlist"}
                    </>
                  )}
                </button>
                {isEdit && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyForm);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
            )}
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-7">
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="card-title mb-0">My Wishlist</h5>
              <button className="btn btn-sm btn-outline-primary" onClick={loadWishlist} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : wishlist.length === 0 ? (
              <div className="text-center py-5">
                <div className="text-muted mb-3">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-muted">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>
                  </svg>
                </div>
                <h6 className="text-muted">No items in wishlist</h6>
                <p className="text-muted small">Add your first item to get started!</p>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {wishlist.map((item) => (
                  <div key={item._id} className="list-group-item border-0 border-bottom">
                    <div className="d-flex gap-3">
                      {/* Image */}
                      {item.imageUrl && (
                        <div className="flex-shrink-0">
                          <img 
                            src={item.imageUrl} 
                            alt={item.title}
                            className="rounded"
                            style={{ width: "60px", height: "60px", objectFit: "cover" }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <h6 className="mb-0 fw-semibold">{item.title}</h6>
                          <span className={`badge ${getPriorityBadgeClass(item.priority)}`}>
                            {item.priority}
                          </span>
                        </div>
                        
                        {item.description && (
                          <p className="text-muted small mb-2">{item.description}</p>
                        )}

                        {item.category && (
                          <span className="badge bg-light text-dark me-2">{item.category}</span>
                        )}

                        {item.price && (
                          <span className="fw-semibold text-primary">
                            {getCurrencySymbol(item.currency)}{item.price}
                          </span>
                        )}
                        
                        <div className="small text-muted mt-2">
                          {item.url && (
                            <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-decoration-none me-3"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                <polyline points="15,3 21,3 21,9"/>
                                <line x1="10" y1="14" x2="21" y2="3"/>
                              </svg>
                              View Product
                            </a>
                          )}
                          <span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="me-1">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12,6 12,12 16,14"/>
                            </svg>
                            Added: {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {item.notes && (
                          <div className="small text-muted mt-1">
                            <em>Note: {item.notes}</em>
                          </div>
                        )}
                      </div>
                      
                      <div className="d-flex flex-column gap-1">
                        <button 
                          className="btn btn-sm btn-outline-primary" 
                          onClick={() => startEdit(item)}
                          title="Edit item"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-success" 
                          onClick={() => markAsPurchased(item._id)}
                          title="Mark as purchased"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-danger" 
                          onClick={() => deleteItem(item._id)}
                          title="Delete item"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




