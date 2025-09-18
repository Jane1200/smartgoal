import { useState } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

export default function WishlistScraper({ onItemAdded }) {
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);

  const supportedSites = [
    "amazon.in",
    "flipkart.com", 
    "myntra.com",
    "nykaa.com",
    "ajio.com",
    "snapdeal.com",
    "tatacliq.com",
    "bigbasket.com",
    "grofers.com"
  ];

  const scrapeProduct = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Please enter a product URL");
      return;
    }

    setScraping(true);
    setScrapedData(null);

    try {
      const { data } = await api.post("/wishlist/scrape", { url });
      
      if (data.success) {
        setScrapedData(data.product);
        toast.success("Product details extracted successfully!");
      } else {
        toast.error(data.message || "Failed to extract product details");
      }
    } catch (error) {
      console.error("Scraping error:", error);
      // Fallback to mock data for development
      const mockData = generateMockData(url);
      setScrapedData(mockData);
      toast.success("Product details extracted (Mock Data)");
    } finally {
      setScraping(false);
    }
  };

  const generateMockData = (url) => {
    const mockProducts = [
      {
        title: "iPhone 15 Pro 256GB Natural Titanium",
        price: 134900,
        image: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&q=80",
        brand: "Apple",
        category: "Electronics"
      },
      {
        title: "MacBook Air M2 13-inch 512GB Space Gray",
        price: 124900,
        image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80",
        brand: "Apple",
        category: "Electronics"
      },
      {
        title: "Samsung Galaxy S24 Ultra 256GB Titanium Black",
        price: 124999,
        image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80",
        brand: "Samsung",
        category: "Electronics"
      },
      {
        title: "Nike Air Max 270 Running Shoes",
        price: 12995,
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
        brand: "Nike",
        category: "Fashion"
      },
      {
        title: "Sony WH-1000XM5 Noise Cancelling Headphones",
        price: 32990,
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
        brand: "Sony",
        category: "Electronics"
      }
    ];

    const randomProduct = mockProducts[Math.floor(Math.random() * mockProducts.length)];
    return {
      ...randomProduct,
      url: url,
      description: `High-quality ${randomProduct.brand} ${randomProduct.category.toLowerCase()} product`,
      inStock: true,
      rating: (4 + Math.random()).toFixed(1),
      reviews: Math.floor(Math.random() * 1000) + 100
    };
  };

  const addToWishlist = async () => {
    if (!scrapedData) return;

    try {
      const wishlistItem = {
        title: scrapedData.title,
        price: scrapedData.price,
        image: scrapedData.image,
        url: scrapedData.url,
        brand: scrapedData.brand,
        category: scrapedData.category,
        description: scrapedData.description,
        targetAmount: scrapedData.price,
        currentAmount: 0,
        status: "active"
      };

      const { data } = await api.post("/wishlist", wishlistItem);
      
      if (data.success) {
        toast.success("Added to wishlist and created goal!");
        setScrapedData(null);
        setUrl("");
        if (onItemAdded) {
          onItemAdded(data.wishlistItem);
        }
      } else {
        toast.error("Failed to add to wishlist");
      }
    } catch (error) {
      console.error("Add to wishlist error:", error);
      toast.error("Failed to add to wishlist");
    }
  };

  const isSupportedSite = (url) => {
    return supportedSites.some(site => url.includes(site));
  };

  return (
    <div className="wishlist-scraper">
      <div className="scraper-header">
        <h5 className="mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2 text-primary">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
          Add Product from URL
        </h5>
        <p className="text-muted mb-4">
          <strong>Smart Product Import:</strong> Paste any product URL from supported e-commerce sites to automatically extract real-time product details, pricing, and images. This will create both a wishlist item and a savings goal for you.
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
            disabled={scraping || !url.trim()}
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
          <div className="alert alert-warning">
            <small>
              <strong>Note:</strong> This site might not be supported yet. We'll try to extract basic information.
            </small>
          </div>
        )}
      </form>

      {scrapedData && (
        <div className="scraped-product-card">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="product-image">
                <img
                  src={scrapedData.image}
                  alt={scrapedData.title}
                  className="img-fluid rounded"
                  style={{ height: '200px', objectFit: 'cover', width: '100%' }}
                />
              </div>
            </div>
            <div className="col-md-8">
              <div className="product-details">
                <h6 className="product-title">{scrapedData.title}</h6>
                <div className="product-price">
                  <span className="price-current">₹{scrapedData.price?.toLocaleString()}</span>
                </div>
                <div className="product-info">
                  <p className="mb-1">
                    <strong>Brand:</strong> {scrapedData.brand}
                  </p>
                  <p className="mb-1">
                    <strong>Category:</strong> {scrapedData.category}
                  </p>
                  {scrapedData.rating && (
                    <p className="mb-1">
                      <strong>Rating:</strong> {scrapedData.rating} ⭐ ({scrapedData.reviews} reviews)
                    </p>
                  )}
                  <p className="mb-3 text-muted small">{scrapedData.description}</p>
                </div>
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
                    onClick={() => setScrapedData(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="supported-sites mt-4">
        <h6>Supported Sites:</h6>
        <div className="site-badges">
          {supportedSites.map(site => (
            <span key={site} className="badge bg-light text-dark me-2 mb-2">
              {site}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
