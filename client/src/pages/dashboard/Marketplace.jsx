import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import api, { getFileUrl } from "@/utils/api.js";
import { toast } from "react-toastify";
import { validateForm, validationRules, validateFileUpload, validateFieldLive } from "@/utils/validations.js";
import { calculateResalePrice, getPricingInsight, extractBrand } from "@/utils/pricingCalculator.js";
import TrustBadge from "@/components/TrustBadge.jsx";

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [listingForm, setListingForm] = useState({
    title: "",
    description: "",
    price: "",
    originalPrice: "",
    purchaseDate: "",
    category: "",
    condition: "",
    images: []
  });
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [pricingSuggestion, setPricingSuggestion] = useState(null);

  useEffect(() => {
    fetchMyListings();
  }, []);

  const resetForm = () => {
    setListingForm({
      title: "",
      description: "",
      price: "",
      originalPrice: "",
      purchaseDate: "",
      category: "",
      condition: "",
      images: []
    });
    setFormErrors({});
    setPricingSuggestion(null);
    setIsEditMode(false);
    setEditingItemId(null);
  };

  const handleEditListing = (item) => {
    setListingForm({
      title: item.title || "",
      description: item.description || "",
      price: item.price || "",
      originalPrice: item.originalPrice || "",
      purchaseDate: item.purchaseDate || "",
      category: item.category || "",
      condition: item.condition || "",
      images: item.images || []
    });
    setIsEditMode(true);
    setEditingItemId(item._id || item.id);
    setFormErrors({});
    setPricingSuggestion(null);
    setShowListingForm(true);
  };

  // Calculate and update pricing suggestion
  const updatePricingSuggestion = (formData) => {
    if (!formData.originalPrice || !formData.condition || !formData.category) {
      setPricingSuggestion(null);
      return;
    }

    try {
      const originalPrice = parseFloat(formData.originalPrice);
      if (isNaN(originalPrice) || originalPrice < 100) {
        setPricingSuggestion(null);
        return;
      }

      const pricing = calculateResalePrice({
        originalPrice,
        condition: formData.condition,
        category: formData.category,
        purchaseDate: formData.purchaseDate || null,
        title: formData.title
      });

      setPricingSuggestion(pricing);
    } catch (error) {
      console.error('Error calculating pricing:', error);
      setPricingSuggestion(null);
    }
  };

  // Live validation handler - validates as user types
  const handleFieldChange = (fieldName, value) => {
    // Update form data
    const updatedForm = { ...listingForm, [fieldName]: value };
    setListingForm(updatedForm);

    // Get validation rules for this field
    const rules = validationRules.marketplace[fieldName];
    if (rules) {
      // Validate and update error state
      const error = validateFieldLive(value, rules, fieldName);
      setFormErrors(prev => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[fieldName] = error;
        } else {
          delete newErrors[fieldName];
        }
        return newErrors;
      });
    }

    // Update pricing suggestion if pricing-related fields changed
    if (['originalPrice', 'condition', 'category', 'purchaseDate', 'title'].includes(fieldName)) {
      updatePricingSuggestion(updatedForm);
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
    
    if (isEditMode) {
      await handleUpdateListing();
    } else {
      await handleCreateListing();
    }
  };

  const handleCreateListing = async () => {
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

  const handleUpdateListing = async () => {
    // Validate only editable fields during update
    const editValidation = validateForm(listingForm, {
      title: validationRules.marketplace.title,
      description: validationRules.marketplace.description,
      category: validationRules.marketplace.category
    });

    if (!editValidation.isValid) {
      setFormErrors(editValidation.errors);
      toast.error("Please fix the validation errors");
      return;
    }

    setFormErrors({});

    try {
      setUploading(true);
      await api.put(`/marketplace/listings/${editingItemId}`, {
        title: listingForm.title,
        description: listingForm.description,
        category: listingForm.category
      });

      toast.success("Listing updated successfully!");
      resetForm();
      setShowListingForm(false);
      fetchMyListings();
    } catch (error) {
      console.error("Failed to update listing:", error);
      if (error.response?.status === 404) {
        toast.error("Listing not found");
      } else {
        toast.error("Failed to update listing. Please try again.");
      }
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
            
            </div>
          </div>

          {/* Listing Form Modal */}
          {showListingForm && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">{isEditMode ? "Edit Listing" : "List Item for Resale"}</h5>
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
                        {/* Item Images - Only show during creation */}
                        {!isEditMode && (
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
                        )}

                        {/* Item Details */}
                        <div className="col-md-6">
                          <label htmlFor="title" className="form-label fw-medium">Item Title *</label>
                          <input
                            type="text"
                            id="title"
                            className={`form-control ${formErrors.title ? 'is-invalid' : ''}`}
                            value={listingForm.title}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            placeholder="e.g., iPhone 12 Pro Max"
                            required
                          />
                          <FormError error={formErrors.title} />
                        </div>

                        {/* Original Price and Purchase Date - Only show during creation */}
                        {!isEditMode && (
                        <>
                        <div className="col-md-6">
                          <label htmlFor="originalPrice" className="form-label fw-medium">Original Price (₹)</label>
                          <input
                            type="number"
                            id="originalPrice"
                            className={`form-control ${formErrors.originalPrice ? 'is-invalid' : ''}`}
                            value={listingForm.originalPrice}
                            onChange={(e) => handleFieldChange('originalPrice', e.target.value)}
                            placeholder="Original purchase price"
                            min="100"
                            max="100000"
                            step="0.01"
                          />
                          <small className="text-muted d-block mt-1">₹100 to ₹1,00,000 (used to calculate fair resale price)</small>
                          <FormError error={formErrors.originalPrice} />
                        </div>

                        <div className="col-md-6">
                          <label htmlFor="purchaseDate" className="form-label fw-medium">Purchase Date</label>
                          <input
                            type="date"
                            id="purchaseDate"
                            className={`form-control ${formErrors.purchaseDate ? 'is-invalid' : ''}`}
                            value={listingForm.purchaseDate}
                            onChange={(e) => handleFieldChange('purchaseDate', e.target.value)}
                            min={(() => {
                              const date = new Date();
                              date.setFullYear(date.getFullYear() - 10);
                              return date.toISOString().split('T')[0];
                            })()}
                            max={new Date().toISOString().split('T')[0]}
                          />
                          <small className="text-muted d-block mt-1">Within last 10 years (helps adjust price for age)</small>
                          <FormError error={formErrors.purchaseDate} />
                        </div>
                        </>
                        )}

                        {/* Pricing Suggestion Box - Only show during creation */}
                        {!isEditMode && pricingSuggestion && (
                          <div className="col-12">
                            <div className="alert alert-info border-0 rounded-3" role="alert">
                              <div className="d-flex align-items-start">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-3 mt-1 flex-shrink-0">
                                  <circle cx="12" cy="12" r="10"/>
                                  <path d="M12 6v6l4 2"/>
                                </svg>
                                <div className="flex-grow-1">
                                  <strong className="d-block mb-2">💡 Smart Pricing Suggestion</strong>
                                  <div className="row g-2 small">
                                    <div className="col-6">
                                      <div className="text-muted">Suggested Price:</div>
                                      <div className="h5 mb-0 text-success">₹{pricingSuggestion.suggested.toLocaleString('en-IN')}</div>
                                    </div>
                                    <div className="col-6">
                                      <div className="text-muted">Value Retained:</div>
                                      <div className="h5 mb-0">{pricingSuggestion.percentOfOriginal}% of original</div>
                                    </div>
                                    <div className="col-12 mt-2 pt-2 border-top">
                                      <div className="text-muted">Recommended Range: ₹{pricingSuggestion.recommendedRange.min.toLocaleString('en-IN')} - ₹{pricingSuggestion.recommendedRange.max.toLocaleString('en-IN')}</div>
                                    </div>
                                    {pricingSuggestion.breakdown.age?.months !== undefined && (
                                      <div className="col-12 mt-2">
                                        <div className="text-muted">
                                          <small>
                                            📅 Age: {pricingSuggestion.breakdown.age.months} month(s) • 
                                            🏷️ Condition: {pricingSuggestion.breakdown.condition.factor} • 
                                            ⭐ Confidence: {pricingSuggestion.confidence}%
                                          </small>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <button 
                                    type="button"
                                    className="btn btn-sm btn-outline-primary mt-2"
                                    onClick={() => handleFieldChange('price', pricingSuggestion.suggested.toString())}
                                  >
                                    Use Suggested Price
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="col-md-6">
                          <label htmlFor="price" className="form-label fw-medium">Resale Price (₹) *</label>
                          <input
                            type="number"
                            id="price"
                            className={`form-control ${formErrors.price ? 'is-invalid' : ''}`}
                            value={listingForm.price}
                            onChange={(e) => handleFieldChange('price', e.target.value)}
                            placeholder="Set your resale price"
                            min="100"
                            step="0.01"
                            disabled={isEditMode}
                            required
                          />
                          {isEditMode && <small className="text-muted d-block mt-1">⚠️ Price cannot be changed after listing</small>}
                          <FormError error={formErrors.price} />
                        </div>

                        <div className="col-md-6">
                          <label htmlFor="category" className="form-label fw-medium">Category *</label>
                          <select
                            id="category"
                            className={`form-select ${formErrors.category ? 'is-invalid' : ''}`}
                            value={listingForm.category}
                            onChange={(e) => handleFieldChange('category', e.target.value)}
                            required
                          >
                            <option value="">Select Category</option>
                            <option value="electronics">Electronics</option>
                            <option value="fashion">Fashion & Apparel</option>
                            <option value="sports">Sports & Outdoor</option>
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
                            onChange={(e) => handleFieldChange('condition', e.target.value)}
                            disabled={isEditMode}
                            required
                          >
                            <option value="">Select Condition</option>
                            <option value="new">New</option>
                            <option value="like-new">Like New</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                            <option value="poor">Poor</option>
                          </select>
                          {isEditMode && <small className="text-muted d-block mt-1">⚠️ Condition cannot be changed after listing</small>}
                          <FormError error={formErrors.condition} />
                        </div>

                        <div className="col-12">
                          <label htmlFor="description" className="form-label fw-medium">Description *</label>
                          <textarea
                            id="description"
                            className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                            rows="4"
                            value={listingForm.description}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
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
                            {isEditMode ? 'Updating...' : 'Listing...'}
                          </>
                        ) : (
                          isEditMode ? 'Update Listing' : 'List Item'
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
                              <button 
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => handleEditListing(item)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
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
