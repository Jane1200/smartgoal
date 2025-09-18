import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import api, { getFileUrl } from "@/utils/api.js";
import { toast } from "react-toastify";
import { validateForm, validationRules, validateFileUpload } from "@/utils/validations.js";

// Inline error components to avoid import issues
const FormError = ({ error, className = "" }) => {
  if (!error) return null;
  return (
    <div className={`text-danger small mt-1 ${className}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      {error}
    </div>
  );
};

const FormErrors = ({ errors, className = "" }) => {
  if (!errors || Object.keys(errors).length === 0) return null;
  return (
    <div className={`alert alert-danger ${className}`}>
      <div className="d-flex align-items-center mb-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <strong>Please fix the following errors:</strong>
      </div>
      <ul className="mb-0">
        {Object.entries(errors).map(([field, error]) => (
          <li key={field}>{error}</li>
        ))}
      </ul>
    </div>
  );
};

export default function Marketplace() {
  const authContext = useAuth();
  const user = authContext?.user;

  // Redirect if not authenticated
  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if not a goal setter
  if (user?.profile?.role !== "goal_setter") {
    return <Navigate to="/dashboard-redirect" replace />;
  }

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showListingForm, setShowListingForm] = useState(false);
  const [listingForm, setListingForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "",
    images: []
  });
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchMyListings();
  }, []);

  const resetForm = () => {
    setListingForm({
      title: "",
      description: "",
      price: "100", // Set minimum price
      category: "",
      condition: "",
      images: []
    });
    setFormErrors({});
  };

  // Test API connection
  const testAPI = async () => {
    try {
      const response = await api.get('/marketplace/featured');
      console.log('API test successful:', response.data);
      toast.success('API connection successful!');
    } catch (error) {
      console.error('API test failed:', error);
      toast.error('API connection failed: ' + (error.response?.data?.message || error.message));
    }
  };

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/marketplace/my-listings");
      setItems(response.data || []);
    } catch (error) {
      console.error("Failed to fetch listings:", error);
      toast.error("Failed to load your listings");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await api.post('/marketplace/upload-image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        return response.data.imageUrl;
      });

      const imageUrls = await Promise.all(uploadPromises);
      setListingForm(prev => ({
        ...prev,
        images: [...prev.images, ...imageUrls]
      }));

      toast.success(`${imageUrls.length} image(s) uploaded successfully`);
    } catch (error) {
      console.error("Image upload failed:", error);
      console.error("Error details:", error.response?.data);
      
      if (error.response?.status === 413) {
        toast.error("File too large. Please select images smaller than 10MB.");
      } else if (error.response?.status === 400) {
        toast.error("Invalid file type. Please select only image files.");
      } else {
        toast.error("Failed to upload images. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    setListingForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const handleSubmitListing = async (e) => {
    e.preventDefault();
    
    // Validate marketplace form
    const marketplaceValidation = validateForm(listingForm, {
      title: validationRules.marketplace.title,
      description: validationRules.marketplace.description,
      price: validationRules.marketplace.price,
      category: validationRules.marketplace.category,
      condition: validationRules.marketplace.condition
    });

    if (!marketplaceValidation.isValid) {
      setFormErrors(marketplaceValidation.errors);
      toast.error("Please fix the validation errors");
      return;
    }

    if (listingForm.images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    setFormErrors({});

    try {
      setUploading(true);
      await api.post("/marketplace/list-item", {
        ...listingForm,
        price: parseFloat(listingForm.price)
      });

      toast.success("Item listed successfully!");
      resetForm();
      setShowListingForm(false);
      fetchMyListings();
    } catch (error) {
      console.error("Failed to list item:", error);
      toast.error("Failed to list item. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteListing = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;

    try {
      await api.delete(`/marketplace/listings/${itemId}`);
      toast.success("Listing deleted successfully");
      fetchMyListings();
    } catch (error) {
      console.error("Failed to delete listing:", error);
      toast.error("Failed to delete listing");
    }
  };

  if (loading) {
    return (
      <div className="container-xxl py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading your marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xxl py-4 marketplace-page">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-1">Marketplace</h1>
              <p className="text-muted mb-0">List your items for resale and fund your goals</p>
            </div>
            <div className="btn-group">
              <button
                className="btn btn-primary"
                onClick={() => {
                  resetForm();
                  setShowListingForm(true);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                List New Item
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={testAPI}
              >
                Test API
              </button>
            </div>
          </div>

          {/* Listing Form Modal */}
          {showListingForm && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">List Item for Resale</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowListingForm(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#6c757d',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        lineHeight: '1',
                        width: '2rem',
                        height: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Close"
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={handleSubmitListing}>
                    <div className="modal-body">
                      <FormErrors errors={formErrors} className="mb-3" />
                      <div className="row g-3">
                        {/* Item Images */}
                        <div className="col-12">
                          <label className="form-label fw-medium">Item Images *</label>
                          <div className="image-upload-area">
                            <input
                              type="file"
                              id="imageUpload"
                              className="d-none"
                              multiple
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e.target.files)}
                            />
                            <label
                              htmlFor="imageUpload"
                              className={`upload-dropzone d-flex flex-column align-items-center justify-content-center p-4 border border-2 border-dashed rounded ${dragActive ? 'dragover' : ''}`}
                              style={{ minHeight: '150px', cursor: 'pointer' }}
                              onDragEnter={handleDrag}
                              onDragLeave={handleDrag}
                              onDragOver={handleDrag}
                              onDrop={handleDrop}
                            >
                              {uploading ? (
                                <div className="text-center">
                                  <div className="spinner-border spinner-border-sm text-primary mb-2"></div>
                                  <p className="mb-0 text-muted">Uploading images...</p>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted mb-2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17,8 12,3 7,8"/>
                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                  </svg>
                                  <p className="mb-0 text-muted">Click to upload images or drag and drop</p>
                                  <small className="text-muted">PNG, JPG up to 10MB each</small>
                                </div>
                              )}
                            </label>
                          </div>
                          
                          {/* Image Previews */}
                          {listingForm.images.length > 0 && (
                            <div className="mt-3">
                              <div className="row g-2">
                                {listingForm.images.map((imageUrl, index) => (
                                  <div key={index} className="col-3">
                                    <div className="position-relative">
                                      <img
                                        src={getFileUrl(imageUrl)}
                                        alt={`Preview ${index + 1}`}
                                        className="img-fluid rounded border"
                                        style={{ width: '100%', height: '100px', objectFit: 'cover' }}
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                                        onClick={() => handleRemoveImage(index)}
                                        style={{ width: '24px', height: '24px', padding: '0', borderRadius: '50%' }}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="col-md-6">
                          <label htmlFor="title" className="form-label fw-medium">Item Title *</label>
                          <input
                            type="text"
                            id="title"
                            className={`form-control ${formErrors.title ? 'is-invalid' : ''}`}
                            value={listingForm.title}
                            onChange={(e) => setListingForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g., iPhone 12 Pro Max"
                            required
                          />
                          <FormError error={formErrors.title} />
                        </div>

                        <div className="col-md-6">
                          <label htmlFor="price" className="form-label fw-medium">Price (₹) *</label>
                          <input
                            type="number"
                            id="price"
                            className={`form-control ${formErrors.price ? 'is-invalid' : ''}`}
                            value={listingForm.price}
                            onChange={(e) => setListingForm(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="100"
                            min="100"
                            step="0.01"
                            required
                          />
                          <FormError error={formErrors.price} />
                        </div>

                        <div className="col-md-6">
                          <label htmlFor="category" className="form-label fw-medium">Category *</label>
                          <select
                            id="category"
                            className={`form-select ${formErrors.category ? 'is-invalid' : ''}`}
                            value={listingForm.category}
                            onChange={(e) => setListingForm(prev => ({ ...prev, category: e.target.value }))}
                            required
                          >
                            <option value="">Select Category</option>
                            <option value="electronics">Electronics</option>
                            <option value="sports">Sports</option>
                            <option value="books">Books</option>
                            <option value="other">Other</option>
                          </select>
                          <FormError error={formErrors.category} />
                        </div>

                        <div className="col-md-6">
                          <label htmlFor="condition" className="form-label fw-medium">Condition *</label>
                          <select
                            id="condition"
                            className={`form-select ${formErrors.condition ? 'is-invalid' : ''}`}
                            value={listingForm.condition}
                            onChange={(e) => setListingForm(prev => ({ ...prev, condition: e.target.value }))}
                            required
                          >
                            <option value="">Select Condition</option>
                            <option value="excellent">Excellent</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                            <option value="poor">Poor</option>
                          </select>
                          <FormError error={formErrors.condition} />
                        </div>

                        <div className="col-12">
                          <label htmlFor="description" className="form-label fw-medium">Description *</label>
                          <textarea
                            id="description"
                            className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                            rows="4"
                            value={listingForm.description}
                            onChange={(e) => setListingForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe your item, its features, and any relevant details... (minimum 10 characters)"
                            required
                          />
                          <FormError error={formErrors.description} />
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowListingForm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={uploading}
                      >
                        {uploading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Listing...
                          </>
                        ) : (
                          'List Item'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* My Listings */}
          <div className="row">
            <div className="col-12">
              <h4 className="mb-3">My Listings</h4>
              
              {items.length === 0 ? (
                <div className="text-center py-5">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted mb-3">
                    <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                    <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M17 9h6M1 15h6M17 15h6"/>
                  </svg>
                  <h5 className="text-muted">No listings yet</h5>
                  <p className="text-muted">Start by listing your first item for resale</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      resetForm();
                      setShowListingForm(true);
                    }}
                  >
                    List Your First Item
                  </button>
                </div>
              ) : (
                <div className="row g-3">
                  {items.map(item => (
                    <div key={item._id || item.id} className="col-md-6 col-lg-4">
                      <div className="card h-100">
                        <div className="position-relative">
                          <img
                            src={
                              getFileUrl(item.images?.[0]?.url || item.images?.[0] || "") ||
                              "https://via.placeholder.com/300x200?text=No+Image"
                            }
                            alt={item.title}
                            className="card-img-top"
                            style={{ height: '200px', objectFit: 'cover' }}
                          />
                          <span className={`badge position-absolute top-0 end-0 m-2 ${
                            item.status === 'active' ? 'bg-success' : 
                            item.status === 'sold' ? 'bg-primary' : 'bg-warning'
                          }`}>
                            {item.status || 'pending'}
                          </span>
                        </div>
                        <div className="card-body d-flex flex-column">
                          <h6 className="card-title">{item.title}</h6>
                          <p className="card-text text-muted small flex-grow-1">
                            {item.description?.substring(0, 100)}...
                          </p>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <div className="fw-bold text-success">₹{item.price?.toLocaleString()}</div>
                              <small className="text-muted">{item.category} • {item.condition}</small>
                            </div>
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-primary">Edit</button>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => handleDeleteListing(item._id || item.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
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
    </div>
  );
}
