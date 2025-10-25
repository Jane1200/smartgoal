import { useState } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

export default function WishlistScraper({ onItemAdded }) {
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);
  const [editingData, setEditingData] = useState(null);
  const [saving, setSaving] = useState(false);

  const supportedSites = [
    "amazon.in",
    "flipkart.com", 
    "myntra.com",
    "nykaa.com"
  ];

  const scrapeProduct = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Please enter a product URL");
      return;
    }

    // Validate that URL is from a supported site
    if (!isSupportedSite(url)) {
      toast.error(`❌ Unsupported site! Only these sites are supported: ${supportedSites.join(", ")}`);
      return;
    }

    setScraping(true);
    setScrapedData(null);
    setEditingData(null);

    // Check if it's a slow site and show appropriate message
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const isSlowSite = /nykaa|myntra/i.test(normalizedUrl);
    
    if (isSlowSite) {
      toast.info("⏳ Nykaa/Myntra detected. This may take 20-30 seconds due to anti-bot protection...", {
        autoClose: 5000
      });
    }

    try {
      const { data } = await api.post("/wishlist/scrape", { url: normalizedUrl });
      
      if (data.success) {
        const product = { ...data.product, url: normalizedUrl };
        setScrapedData(product);
        setEditingData(product);
        
        if (data.note) {
          toast.warning(data.note);
        } else {
          toast.success("Product details extracted successfully!");
        }
      } else {
        toast.error(data.message || "Failed to extract product details");
      }
    } catch (error) {
      console.error("Scraping error:", error);
      const errorMsg = error.response?.data?.message || "Failed to scrape product details from the URL";
      toast.error(errorMsg);
      
      // Show helpful hint for blocked sites
      if (error.response?.status === 500 && isSlowSite) {
        toast.info("💡 Tip: If scraping fails repeatedly, try copying the product details manually", {
          autoClose: 7000
        });
      }
    } finally {
      setScraping(false);
    }
  };



  const addToWishlist = async () => {
    if (!editingData) return;

    // Basic validation
    if (!editingData.title || editingData.title.trim().length === 0) {
      toast.error("Please enter a product title");
      return;
    }
    if (editingData.price < 0) {
      toast.error("Price cannot be negative");
      return;
    }

    setSaving(true);

    try {
      const rawTitle = editingData.title?.trim() ?? "";
      if (rawTitle.length > 200) {
        toast.warning("Title was too long and has been truncated to 200 characters.");
      }
      const title = rawTitle.slice(0, 200);

      const priceValue =
        typeof editingData.price === "number"
          ? editingData.price
          : Number(String(editingData.price ?? "").replace(/[^\d.]/g, ""));
      const price = Number.isFinite(priceValue) && priceValue >= 0 ? priceValue : 0;

      const rawUrl = editingData.url?.trim();
      const normalizedUrl = rawUrl
        ? /^https?:\/\//i.test(rawUrl)
          ? rawUrl
          : `https://${rawUrl}`
        : undefined;
      let url = normalizedUrl;
      if (normalizedUrl && normalizedUrl.length > 2048) {
        toast.warning("Product URL was too long and has been omitted.");
        url = undefined;
      }

      const rawCategory = editingData.category?.trim();
      if (rawCategory && rawCategory.length > 100) {
        toast.warning("Category was too long and has been shortened to 100 characters.");
      }
      const category =
        rawCategory && rawCategory.length > 0 ? rawCategory.slice(0, 100) : "General";

      const rawDescription = editingData.description?.trim();
      let description = rawDescription ? rawDescription.slice(0, 2000) : undefined;
      if (rawDescription && rawDescription.length > 2000) {
        toast.warning("Description was too long and has been truncated to 2000 characters.");
      }

      const rawImage = editingData.image?.trim();
      let imageUrl = rawImage ? rawImage.slice(0, 2048) : undefined;
      if (rawImage && rawImage.length > 2048) {
        toast.warning("Image URL was too long and has been omitted.");
        imageUrl = undefined;
      }

      const rawNotes = editingData.notes?.trim();
      let notes = rawNotes ? rawNotes.slice(0, 1000) : undefined;
      if (rawNotes && rawNotes.length > 1000) {
        toast.warning("Notes were too long and have been truncated to 1000 characters.");
      }

      const allowedCurrencies = ["INR", "USD", "EUR"];
      const currency = allowedCurrencies.includes(editingData.currency)
        ? editingData.currency
        : "INR";

      const wishlistItem = {
        title,
        price,
        url,
        category,
        description,
        imageUrl,
        currency,
        notes,
      };

      const payload = Object.fromEntries(
        Object.entries(wishlistItem).filter(([_, value]) => value !== undefined && value !== null)
      );

      const { data } = await api.post("/wishlist", payload);

      if (data && data._id) {
        try {
          await api.post("/goals", {
            title: data.title,
            description: data.description,
            targetAmount: data.price ?? 0,
            currentAmount: 0,
            sourceWishlistId: data._id // Link the goal to this wishlist item
          });
          toast.success("Added to wishlist and created goal!");
        } catch (goalError) {
          console.error("Goal creation from scraper failed:", goalError);
          toast.warning(goalError.response?.data?.message || "Wishlist saved but goal creation failed");
        }

        setScrapedData(null);
        setEditingData(null);
        setUrl("");
        if (onItemAdded) {
          onItemAdded(data);
        }
      } else {
        toast.error("Failed to add to wishlist");
      }
    } catch (error) {
      console.error("Add to wishlist error:", error);
      if (error.response?.status === 409) {
        toast.error("This product link is already on your wishlist.");
      } else {
        toast.error(error.response?.data?.message || "Failed to add to wishlist");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditingData(prev => ({ ...prev, [field]: value }));
  };

  const isSupportedSite = (url) => {
    return supportedSites.some(site => url.includes(site));
  };

  return (
    <div className="wishlist-scraper">
      <div className="scraper-header">
        <p className="text-muted mb-4">
          <strong>Smart Product Import:</strong> Paste a product URL from supported e-commerce sites (amazon.in, flipkart.com, myntra.com, nykaa.com) to automatically extract product details. This will create both a wishlist item and a savings goal.
        </p>
      </div>

      <form onSubmit={scrapeProduct} className="scraper-form">
        <div className="input-group mb-3">
          <input
            type="url"
            className="form-control"
            placeholder="https://amazon.in/product-url or https://flipkart.com/product-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={scraping || !url.trim() || (url.trim() && !isSupportedSite(url))}
            title={url.trim() && !isSupportedSite(url) ? `Only ${supportedSites.join(", ")} are supported` : ""}
          >
            {scraping ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Scraping...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                Extract Product Details
              </>
            )}
          </button>
        </div>

        {url && !isSupportedSite(url) && (
          <div className="ps-3 border-start border-2">
            <small className="text-muted">
              Unsupported site. Supported: {supportedSites.join(", ")}
            </small>
          </div>
        )}
      </form>

      {editingData && (
        <div className="scraped-product-form mt-4">
          <h6 className="mb-3">Edit Product Details</h6>
          <div className="row g-3">
            <div className="col-12">
              <div className="mb-3">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingData.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Price (₹)</label>
                <input
                  type="number"
                  className="form-control"
                  value={editingData.price || ''}
                  onChange={(e) => handleFieldChange('price', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Brand</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingData.brand || ''}
                  onChange={(e) => handleFieldChange('brand', e.target.value)}
                />
              </div>
            </div>
            <div className="col-12">
              <div className="mb-3">
                <label className="form-label">Category</label>
                <select
                  className="form-control"
                  value={editingData.category || ''}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                >
                  <option value="General">General</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Home">Home</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Image URL</label>
                <input
                  type="url"
                  className="form-control"
                  value={editingData.image || ''}
                  onChange={(e) => handleFieldChange('image', e.target.value)}
                />
              </div>
              {editingData.image && (
                <div className="mb-3">
                  <label className="form-label">Preview</label>
                  <div>
                    <img
                      src={editingData.image}
                      alt="Product preview"
                      className="img-fluid rounded"
                      style={{ height: '150px', objectFit: 'cover' }}
                      onError={(e) => e.target.src = 'https://dummyimage.com/150x150/cccccc/000000&text=No+Image'}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="col-12">
              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={editingData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                />
              </div>
            </div>
            <div className="col-12">
              <div className="product-actions">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={addToWishlist}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>
                  </svg>
                  Add to Wishlist & Create Savings Goal
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary ms-2"
                  onClick={() => {
                    setScrapedData(null);
                    setEditingData(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
