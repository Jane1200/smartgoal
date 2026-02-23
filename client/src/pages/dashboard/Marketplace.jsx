import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import api, { getFileUrl } from "@/utils/api.js";
import { toast } from "react-toastify";
import { validateForm, validationRules, validateFileUpload, validateFieldLive } from "@/utils/validations.js";
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
    category: "electronics",
    subCategory: "",
    condition: "",
    images: [],
    originalPrice: "",
    purchaseDate: "",
    brand: "",
  });
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [deleteModal, setDeleteModal] = useState({ open: false, itemId: null, title: "" });

  // AI price estimation + defect scan state
  const [aiEstimate, setAiEstimate] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [priceAccepted, setPriceAccepted] = useState(false);
  // Defect scan results from /scan-defects
  const [defectScan, setDefectScan] = useState(null);   // { defects, alertLevel, hasDefects, summary, condition }

  useEffect(() => {
    fetchMyListings();
  }, []);

  const resetForm = () => {
    setListingForm({
      title: "",
      description: "",
      price: "",
      category: "electronics",
      subCategory: "",
      condition: "",
      images: [],
      originalPrice: "",
      purchaseDate: "",
      brand: "",
    });
    setFormErrors({});
    setIsEditMode(false);
    setEditingItemId(null);
    setAiEstimate(null);
    setPriceAccepted(false);
    setDefectScan(null);
  };

  const handleEditListing = (item) => {
    setListingForm({
      title: item.title || "",
      description: item.description || "",
      price: item.price || "",
      category: "electronics",
      subCategory: item.subCategory || "",
      condition: item.condition || "",
      images: item.images || [],
      originalPrice: "",
      purchaseDate: "",
      brand: "",
    });
    setIsEditMode(true);
    setEditingItemId(item._id || item.id);
    setFormErrors({});
    setAiEstimate(null);
    setPriceAccepted(false);
    setDefectScan(null);
    setShowListingForm(true);
  };

  // ── AI Price Estimation ───────────────────────────────────────────────────
  const acceptAiPrice = () => {
    if (!aiEstimate) return;
    setListingForm(prev => ({ ...prev, price: String(aiEstimate.amount) }));
    setPriceAccepted(true);
    toast.success(`AI price ₹${aiEstimate.amount.toLocaleString()} applied!`);
  };

  // Live validation + AI trigger on relevant field changes
  const handleFieldChange = (fieldName, value) => {
    const updatedForm = { ...listingForm, [fieldName]: value };
    setListingForm(updatedForm);

    const rules = validationRules.marketplace[fieldName];
    if (rules) {
      const error = validateFieldLive(value, rules, fieldName);
      setFormErrors(prev => {
        const newErrors = { ...prev };
        if (error) newErrors[fieldName] = error;
        else delete newErrors[fieldName];
        return newErrors;
      });
    }

    if (["originalPrice", "purchaseDate", "brand", "subCategory"].includes(fieldName)) {
      setPriceAccepted(false);
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

  const handleSyncIncome = async () => {
    try {
      setSyncing(true);
      const response = await api.post("/orders/sync-marketplace-income");
      
      if (response.data.success) {
        if (response.data.incomesCreated > 0) {
          toast.success(
            `✅ Synced ${response.data.incomesCreated} sale(s) totaling ₹${response.data.totalAmount.toLocaleString()}! Check your Finance page.`,
            { autoClose: 5000 }
          );
        } else {
          toast.info("All marketplace sales are already synced with your finances!", { autoClose: 4000 });
        }
      }
    } catch (error) {
      console.error("Failed to sync income:", error);
      toast.error(error.response?.data?.message || "Failed to sync marketplace income");
    } finally {
      setSyncing(false);
    }
  };

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setDefectScan(null);
    setAiEstimate(null);
    setPriceAccepted(false);

    try {
      const firstFile = files[0];

      // ── 1. Upload image(s) to get URLs ──────────────────────────────────────
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        const response = await api.post('/marketplace/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.imageUrl;
      });
      const imageUrls = await Promise.all(uploadPromises);

      setListingForm(prev => ({ ...prev, images: [...prev.images, ...imageUrls] }));
      toast.success(`${imageUrls.length} image(s) uploaded`);

      // ── 2. Scan first image for defects + get price estimate ─────────────────
      setIsEstimating(true);
      try {
        const scanForm = new FormData();
        scanForm.append('image', firstFile);
        scanForm.append('category',
          listingForm.subCategory === 'laptop' ? 'laptop' : 'phone');
        scanForm.append('brand',
          listingForm.brand || listingForm.title?.split(' ')[0] || 'Other');

        const { data } = await api.post('/marketplace/scan-defects', scanForm, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (data.success) {
          setDefectScan({
            defects:    data.defects || [],
            alertLevel: data.alertLevel || 'success',
            hasDefects: data.hasDefects || false,
            summary:    data.summary || '',
            condition:  data.condition,
            isAnomaly:  data.isAnomaly || false,
          });

          setAiEstimate({
            amount:         data.price.amount,
            min:            data.price.min_price,
            max:            data.price.max_price,
            conditionLabel: data.condition?.label || 'unknown',
            conditionScore: data.condition?.score || 60,
            priceSource:    data.priceSource || 'dataset_median',
            modelUsed:      data.modelUsed || 'ml_trained',
          });

          // Auto-fill price + condition
          setListingForm(prev => ({
            ...prev,
            price: prev.price || String(data.price.amount),
            condition: data.condition?.label || prev.condition,
          }));
          setPriceAccepted(!listingForm.price);

          if (data.hasDefects) {
            toast.warn(`Defects detected: ${data.defects.map(d => d.name).join(', ')}`, { autoClose: 6000 });
          } else {
            toast.success('No defects found — item looks good!');
          }
        }
      } catch (scanErr) {
        const s = scanErr.response?.status;
        if (s === 503) {
          toast.info('AI scan service offline. Run: python resale_price_estimation/api.py', { autoClose: 8000 });
        } else {
          console.warn('Defect scan failed:', scanErr.message);
        }
      } finally {
        setIsEstimating(false);
      }

    } catch (error) {
      console.error("Image upload failed:", error);
      if (error.response?.status === 413) {
        toast.error("File too large. Max 10MB.");
      } else if (error.response?.status === 400) {
        toast.error("Invalid file type. Images only.");
      } else {
        toast.error("Failed to upload image. Please try again.");
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
  };  const handleDrop = (e) => {
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
      const response = await api.post("/marketplace/list-item", {
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
  };  const handleUpdateListing = async () => {
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

  const handleDeleteListing = async () => {
    try {
      if (!deleteModal.itemId) return;
      await api.delete(`/marketplace/listings/${deleteModal.itemId}`);
      toast.success("Listing deleted successfully");
      fetchMyListings();
    } catch (error) {
      console.error("Failed to delete listing:", error);
      toast.error("Failed to delete listing");
    } finally {
      setDeleteModal({ open: false, itemId: null, title: "" });
    }
  };

  const openDeleteModal = (item) => {
    setDeleteModal({
      open: true,
      itemId: item._id || item.id,
      title: item.title || "this listing"
    });
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

  function resolveImageSrc(imageObjOrStr) {
    // Accepts array element (either string or object), returns actual usable URL or undefined
    if (!imageObjOrStr) return undefined;
    // If already string and looks like a URL, just return it through getFileUrl
    if (typeof imageObjOrStr === "string") {
      return getFileUrl(imageObjOrStr);
    }
    // If it's an object with a .url field, return via getFileUrl
    if (typeof imageObjOrStr === "object" && imageObjOrStr.url) {
      return getFileUrl(imageObjOrStr.url);
    }
    return undefined;
  }

  return (
    <div className="container-xxl py-4 marketplace-page">
      {deleteModal.open && (
        <>
          <div
            className="modal fade show"
            style={{ display: "block" }}
            role="dialog"
            aria-modal="true"
            aria-label="Delete listing confirmation"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <h5 className="modal-title">Delete Listing</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setDeleteModal({ open: false, itemId: null, title: "" })}
                  />
                </div>
                <div className="modal-body">
                  <p className="mb-2">
                    Are you sure you want to delete <strong>{deleteModal.title}</strong>?
                  </p>
                  <p className="text-muted mb-0">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setDeleteModal({ open: false, itemId: null, title: "" })}
                  >
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={handleDeleteListing}>
                    Delete Listing
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-1">Marketplace</h1>
              <p className="text-muted mb-0">List your items for resale and fund your goals</p>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-success"
                onClick={handleSyncIncome}
                disabled={syncing}
                title="Sync sold items to finance income"
              >
                {syncing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                    </svg>
                    Sync Income
                  </>
                )}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  resetForm();
                  setShowListingForm(true);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
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

                        {/* ── Item Images (creation only) ────────────────── */}
                        {!isEditMode && (
                          <div className="col-12">
                            <label className="form-label fw-medium">
                              Item Images *
                              <span className="badge bg-primary ms-2" style={{ fontSize: '0.7rem' }}>
                                🔍 AI scans image for defects &amp; auto-estimates price
                              </span>
                            </label>
                            {listingForm.images.length === 0 && !isEstimating && !defectScan && (
                              <div className="alert alert-secondary py-2 mb-2 d-flex align-items-center gap-2" style={{ fontSize: '0.82rem' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                Upload a photo of your item — AI will scan it for defects (cracks, scratches, dark spots) and estimate the resale price automatically. No original price needed.
                              </div>
                            )}
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
                                style={{ minHeight: '140px', cursor: 'pointer' }}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                              >
                                {uploading ? (
                                  <div className="text-center">
                                    <div className="spinner-border spinner-border-sm text-primary mb-2"></div>
                                    <p className="mb-0 text-muted small">Uploading &amp; analysing...</p>
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted mb-2">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                      <polyline points="17,8 12,3 7,8"/>
                                      <line x1="12" y1="3" x2="12" y2="15"/>
                                    </svg>
                                    <p className="mb-0 text-muted small">Click to upload or drag &amp; drop</p>
                                    <small className="text-muted">PNG, JPG up to 10MB each</small>
                                  </div>
                                )}
                              </label>
                            </div>
                            {listingForm.images.length > 0 && (
                              <div className="mt-2 row g-2">
                                {listingForm.images.map((imageUrl, index) => (
                                  <div key={index} className="col-3">
                                    <div className="position-relative">
                                      <img
                                        src={resolveImageSrc(imageUrl)}
                                        alt={`Preview ${index + 1}`}
                                        className="img-fluid rounded border"
                                        style={{ width: '100%', height: '90px', objectFit: 'cover' }}
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                                        onClick={() => handleRemoveImage(index)}
                                        style={{ width: '22px', height: '22px', padding: 0, borderRadius: '50%', fontSize: '12px' }}
                                      >×</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── Item Title ──────────────────────────────────── */}
                        <div className="col-12">
                          <label htmlFor="title" className="form-label fw-medium">Item Title *</label>
                          <input
                            type="text"
                            id="title"
                            className={`form-control ${formErrors.title ? 'is-invalid' : ''}`}
                            value={listingForm.title}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            placeholder="e.g., iPhone 13 Pro, Dell XPS 15, Apple Watch Series 8"
                            required
                          />
                          <FormError error={formErrors.title} />
                        </div>

                        {/* ── Brand + Device Type ─────────────────────────── */}
                        <div className="col-md-6">
                          <label htmlFor="brand" className="form-label fw-medium">Brand</label>
                          <select
                            id="brand"
                            className="form-select"
                            value={listingForm.brand}
                            onChange={(e) => handleFieldChange('brand', e.target.value)}
                          >
                            <option value="">Select Brand</option>
                            <option value="Apple">Apple</option>
                            <option value="Samsung">Samsung</option>
                            <option value="OnePlus">OnePlus</option>
                            <option value="Xiaomi">Xiaomi</option>
                            <option value="Oppo">Oppo</option>
                            <option value="Vivo">Vivo</option>
                            <option value="Dell">Dell</option>
                            <option value="HP">HP</option>
                            <option value="Lenovo">Lenovo</option>
                            <option value="Asus">Asus</option>
                            <option value="Acer">Acer</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="col-md-6">
                          <label htmlFor="subCategory" className="form-label fw-medium">Device Type *</label>
                          <select
                            id="subCategory"
                            className={`form-select ${formErrors.subCategory ? 'is-invalid' : ''}`}
                            value={listingForm.subCategory}
                            onChange={(e) => handleFieldChange('subCategory', e.target.value)}
                            required
                          >
                            <option value="">Select Device Type</option>
                            <option value="phone">📱 Phone</option>
                            <option value="laptop">💻 Laptop</option>
                            <option value="smartwatch">⌚ Smartwatch</option>
                            <option value="earphones">🎧 Earphones</option>
                          </select>
                          <FormError error={formErrors.subCategory} />
                        </div>

                        {/* ── Original Price + Purchase Date ──────────────── */}
                        {!isEditMode && (
                          <>
                            <div className="col-md-6">
                              <label htmlFor="originalPrice" className="form-label fw-medium">
                                Original Purchase Price (₹)
                                <span className="text-muted ms-1" style={{ fontSize: '0.75rem' }}>(optional)</span>
                              </label>
                              <input
                                type="number"
                                id="originalPrice"
                                className="form-control"
                                value={listingForm.originalPrice}
                                onChange={(e) => handleFieldChange('originalPrice', e.target.value)}
                                placeholder="e.g., 80000"
                                min="100"
                              />
                            </div>
                            <div className="col-md-6">
                              <label htmlFor="purchaseDate" className="form-label fw-medium">
                                Purchase Date
                                <span className="text-muted ms-1" style={{ fontSize: '0.75rem' }}>for AI estimate</span>
                              </label>
                              <input
                                type="date"
                                id="purchaseDate"
                                className="form-control"
                                value={listingForm.purchaseDate}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={(e) => handleFieldChange('purchaseDate', e.target.value)}
                              />
                            </div>
                          </>
                        )}

                        {/* ── AI Price Estimate Panel ──────────────────────── */}
                        {!isEditMode && (
                          <div className="col-12">
                            {/* ── Scanning indicator ─────────────────────── */}
                            {isEstimating && (
                              <div className="alert alert-info d-flex align-items-center py-2 mb-2">
                                <div className="spinner-border spinner-border-sm me-2 text-info" role="status"></div>
                                <small><strong>AI is scanning image</strong> for defects and estimating resale price...</small>
                              </div>
                            )}

                            {/* ── Defect Alert Panel ─────────────────────── */}
                            {defectScan && !isEstimating && (() => {
                              const alertClass = {
                                danger:  'alert-danger',
                                warning: 'alert-warning',
                                info:    'alert-info',
                                success: 'alert-success',
                              }[defectScan.alertLevel] || 'alert-secondary';
                              const icon = {
                                danger:  '🚨',
                                warning: '⚠️',
                                info:    'ℹ️',
                                success: '✅',
                              }[defectScan.alertLevel] || '🔍';
                              return (
                                <div className={`alert ${alertClass} mb-2`} style={{ fontSize: '0.88rem' }}>
                                  <div className="d-flex align-items-center mb-1">
                                    <span className="me-2" style={{ fontSize: '1.1rem' }}>{icon}</span>
                                    <strong>AI Defect Scan Result</strong>
                                    {defectScan.condition && (
                                      <span className="badge bg-secondary ms-2" style={{ fontSize: '0.7rem' }}>
                                        Condition: {defectScan.condition.label?.toUpperCase()} ({defectScan.condition.score}/100)
                                      </span>
                                    )}
                                  </div>
                                  <div className="mb-1">{defectScan.summary}</div>
                                  {defectScan.defects.length > 0 && (
                                    <ul className="mb-0 ps-3" style={{ fontSize: '0.82rem' }}>
                                      {defectScan.defects.map((d, i) => (
                                        <li key={i}>
                                          <strong>{d.name}</strong>
                                          <span className={`badge ms-1 ${d.severity === 'severe' ? 'bg-danger' : d.severity === 'moderate' ? 'bg-warning text-dark' : 'bg-secondary'}`}
                                            style={{ fontSize: '0.65rem' }}>
                                            {d.severity}
                                          </span>
                                          {' — '}{d.description}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              );
                            })()}

                            {/* ── AI Price Estimate ──────────────────────── */}
                            {aiEstimate && !isEstimating && (
                              <div className={`border rounded p-3 ${priceAccepted ? 'border-success bg-success bg-opacity-10' : 'border-primary bg-primary bg-opacity-10'}`}>
                                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                                  <div>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                      <span className="badge bg-primary">🤖 AI Price Estimate</span>
                                      <span className="badge bg-success" style={{ fontSize: '0.65rem' }}>ML Model</span>
                                      {aiEstimate.conditionLabel && aiEstimate.conditionLabel !== 'unknown' && (
                                        <span className="badge bg-info text-dark" style={{ fontSize: '0.65rem' }}>
                                          {aiEstimate.conditionLabel} — {aiEstimate.conditionScore}/100
                                        </span>
                                      )}
                                    </div>
                                    <div className="fw-bold fs-5 text-primary">
                                      ₹{aiEstimate.amount.toLocaleString()}
                                    </div>
                                    <small className="text-muted">
                                      Market range: ₹{aiEstimate.min.toLocaleString()} – ₹{aiEstimate.max.toLocaleString()}
                                      {aiEstimate.priceSource === 'dataset_median' && (
                                        <span className="ms-1 text-secondary">(based on 5,000 resale records)</span>
                                      )}
                                    </small>
                                  </div>
                                  {!priceAccepted ? (
                                    <button type="button" className="btn btn-sm btn-primary" onClick={acceptAiPrice}>
                                      ✓ Use This Price
                                    </button>
                                  ) : (
                                    <span className="badge bg-success py-2 px-3">✓ Applied</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}


                        {/* ── Resale Price ─────────────────────────────────── */}
                        <div className="col-md-6">
                          <label htmlFor="price" className="form-label fw-medium">
                            Resale Price (₹) *
                            {aiEstimate && !isEditMode && (
                              <span className="text-muted ms-1" style={{ fontSize: '0.75rem' }}>
                                {priceAccepted ? '(AI suggested)' : '(override AI price if needed)'}
                              </span>
                            )}
                          </label>
                          <div className="input-group">
                            <span className="input-group-text">₹</span>
                            <input
                              type="number"
                              id="price"
                              className={`form-control ${formErrors.price ? 'is-invalid' : ''} ${priceAccepted ? 'border-success' : ''}`}
                              value={listingForm.price}
                              placeholder="e.g., 15000"
                              min="100"
                              step="1"
                              onChange={(e) => {
                                handleFieldChange('price', e.target.value);
                                setPriceAccepted(false);
                              }}
                              required
                              disabled={isEditMode}
                            />
                          </div>
                          {isEditMode && <small className="text-warning d-block mt-1">⚠️ Price cannot be changed after listing</small>}
                          <FormError error={formErrors.price} />
                        </div>

                        {/* ── Description ──────────────────────────────────── */}
                        <div className="col-12">
                          <label htmlFor="description" className="form-label fw-medium">Description *</label>
                          <textarea
                            id="description"
                            className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                            rows="3"
                            value={listingForm.description}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
                            placeholder="Describe your item — accessories included, any defects, reason for selling... (min 10 characters)"
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

          {/* My Listings with Tabs */}
          <div className="row">
            <div className="col-12">
              {/* Tabs Navigation */}
              <ul className="nav nav-tabs mb-4" role="tablist">
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'active' ? 'active' : ''}`}
                    id="active-tab"
                    onClick={() => setActiveTab('active')}
                    type="button"
                    role="tab"
                    aria-controls="active-listings"
                    aria-selected={activeTab === 'active'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                      <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                    </svg>
                    Active Listings ({items.filter(item => item.status === 'active').length})
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'sold' ? 'active' : ''}`}
                    id="sold-tab"
                    onClick={() => setActiveTab('sold')}
                    type="button"
                    role="tab"
                    aria-controls="sold-items"
                    aria-selected={activeTab === 'sold'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    Sold Items ({items.filter(item => item.status === 'sold').length})
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
                    id="pending-tab"
                    onClick={() => setActiveTab('pending')}
                    type="button"
                    role="tab"
                    aria-controls="pending-items"
                    aria-selected={activeTab === 'pending'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Pending ({items.filter(item => item.status === 'pending').length})
                  </button>
                </li>
              </ul>

              {/* Tab Content */}
              <div className="tab-content">
                {/* Active Listings Tab */}
                {activeTab === 'active' && (
                  <div
                    className="tab-pane fade show active"
                    id="active-listings"
                    role="tabpanel"
                    aria-labelledby="active-tab"
                  >
                    {items.filter(item => item.status === 'active').length === 0 ? (
                      <div className="text-center py-5">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted mb-3">
                          <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                          <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M17 9h6M1 15h6M17 15h6"/>
                        </svg>
                        <h5 className="text-muted">No active listings</h5>
                        <p className="text-muted">List your items here to start selling</p>
                      </div>
                  ) : (
                    <div className="row g-3">
                      {items.filter(item => item.status === 'active').map(item => (
                        <div key={item._id || item.id} className="col-md-6 col-lg-4">
                          <div className="card h-100">
                            <div className="position-relative">
                              <img
                                src={
                                  resolveImageSrc(
                                    Array.isArray(item.images)
                                      ? (item.images[0] || "")
                                      : ""
                                  ) || "https://via.placeholder.com/300x200?text=No+Image"
                                }
                                alt={item.title}
                                className="card-img-top"
                                style={{ height: '200px', objectFit: 'cover' }}
                              />
                              <div className="position-absolute top-0 end-0 m-2">
                                <span className="badge bg-success">ACTIVE</span>
                              </div>
                            </div>
                            <div className="card-body d-flex flex-column">
                              <h6 className="card-title">{item.title}</h6>
                              <p className="card-text text-muted small flex-grow-1">
                                {item.description?.substring(0, 100)}...
                              </p>
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <div>
                                  <div className="fw-bold text-success">₹{item.price?.toLocaleString()}</div>
                                  <small className="text-muted">{item.category} • {item.condition}</small>
                                </div>
                              </div>
                              <div className="d-flex gap-2">
                                <button 
                                  type="button"
                                  className="btn btn-sm btn-outline-primary flex-fill"
                                  onClick={() => handleEditListing(item)}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                  </svg>
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger flex-fill"
                                  onClick={() => openDeleteModal(item)}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

                {/* Sold Items Tab */}
                {activeTab === 'sold' && (
                <div
                  className="tab-pane fade show active"
                  id="sold-items"
                  role="tabpanel"
                  aria-labelledby="sold-tab"
                >
                  {items.filter(item => item.status === 'sold').length === 0 ? (
                    <div className="text-center py-5">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted mb-3">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      <h5 className="text-muted">No sold items yet</h5>
                      <p className="text-muted">Your sold items will appear here</p>
                    </div>
                  ) : (
                    <>
                      <div className="alert alert-success mb-3">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        <strong>Congratulations!</strong> You've sold {items.filter(item => item.status === 'sold').length} item(s). 
                        Don't forget to sync your income to track earnings!
                      </div>
                      <div className="row g-3">
                        {items.filter(item => item.status === 'sold').map(item => (
                          <div key={item._id || item.id} className="col-md-6 col-lg-4">
                            <div className="card h-100 border-success">
                              <div className="position-relative">
                                <img
                                  src={
                                    resolveImageSrc(
                                      Array.isArray(item.images)
                                        ? (item.images[0] || "")
                                        : ""
                                    ) || "https://via.placeholder.com/300x200?text=No+Image"
                                  }
                                  alt={item.title}
                                  className="card-img-top"
                                  style={{ height: '200px', objectFit: 'cover', opacity: 0.8 }}
                                />
                                <div className="position-absolute top-0 end-0 m-2">
                                  <span className="badge bg-success">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="me-1">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    SOLD
                                  </span>
                                </div>
                                {item.soldAt && (
                                  <div className="position-absolute bottom-0 start-0 m-2">
                                    <span className="badge bg-dark bg-opacity-75">
                                      Sold: {new Date(item.soldAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
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
                                </div>
                                <div className="mt-2 p-2 bg-success bg-opacity-10 rounded">
                                  <small className="text-success d-flex align-items-center">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    This item has been successfully sold
                                  </small>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                )}

                {/* Pending Items Tab */}
                {activeTab === 'pending' && (
                <div
                  className="tab-pane fade show active"
                  id="pending-items"
                  role="tabpanel"
                  aria-labelledby="pending-tab"
                >
                  {items.filter(item => item.status === 'pending').length === 0 ? (
                    <div className="text-center py-5">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted mb-3">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <h5 className="text-muted">No pending items</h5>
                      <p className="text-muted">Items awaiting payment confirmation will appear here</p>
                    </div>
                  ) : (
                    <>
                      <div className="alert alert-warning mb-3">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <strong>Pending Payments:</strong> These items are awaiting payment confirmation.
                      </div>
                      <div className="row g-3">
                        {items.filter(item => item.status === 'pending').map(item => (
                          <div key={item._id || item.id} className="col-md-6 col-lg-4">
                            <div className="card h-100 border-warning">
                              <div className="position-relative">
                                <img
                                  src={
                                    resolveImageSrc(
                                      Array.isArray(item.images)
                                        ? (item.images[0] || "")
                                        : ""
                                    ) || "https://via.placeholder.com/300x200?text=No+Image"
                                  }
                                  alt={item.title}
                                  className="card-img-top"
                                  style={{ height: '200px', objectFit: 'cover' }}
                                />
                                <div className="position-absolute top-0 end-0 m-2">
                                  <span className="badge bg-warning text-dark">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                                      <circle cx="12" cy="12" r="10"/>
                                      <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    PENDING
                                  </span>
                                </div>
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
                                </div>
                                <div className="mt-2 p-2 bg-warning bg-opacity-10 rounded">
                                  <small className="text-warning d-flex align-items-center">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                                      <circle cx="12" cy="12" r="10"/>
                                      <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    Awaiting payment confirmation
                                  </small>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
