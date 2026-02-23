import { useState, useEffect } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

// ── Site brand colours & logos ─────────────────────────────────────────────────
const SITE_META = {
  amazon: {
    color: "#FF9900",
    bg: "#FFF8ED",
    border: "#FFBC5A",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="#FF9900">
        <path d="M21.52 16.32c-2.74 1.82-6.73 2.79-10.16 2.79-4.8 0-9.13-1.78-12.4-4.74-.26-.24-.03-.57.29-.38 3.53 2.05 7.9 3.28 12.41 3.28 3.04 0 6.38-.63 9.46-1.94.47-.2.86.31.4.99z"/>
        <path d="M22.7 14.92c-.35-.45-2.31-.21-3.19-.11-.27.03-.31-.2-.07-.38 1.56-1.1 4.12-.78 4.42-.41.3.37-.08 2.94-1.54 4.17-.22.19-.44.09-.34-.16.33-.82 1.07-2.66.72-3.11z"/>
        <path d="M20.25 3.36C19.2 2.1 17.23 1.5 15.6 1.5c-2.4 0-4.37 1-5.61 2.73-.12.17-.03.4.16.31 1.56-.72 3.5-1.15 5.28-1.15 1.54 0 3.48.36 4.91 1.22.22.13.41-.09.31-.26h.6zM6.05 8.7c0 .77.08 1.39.24 1.85.16.46.42.96.79 1.48.13.18.04.43-.22.43H5.5c-.23 0-.4-.11-.55-.32L3.62 10.3A6.12 6.12 0 0 1 2 6.37C2 3.78 4.15 2 7.06 2c1.76 0 3.02.47 3.88 1.42.55.61.85 1.43.85 2.34v.3c0 1.17-.3 2.12-.9 2.82-.6.7-1.48 1.07-2.58 1.07-1.19 0-2.26-.48-2.26-1.25zm4.01-1.46c0-.52-.13-1.02-.38-1.34-.27-.34-.66-.51-1.1-.51-.57 0-1.02.27-1.32.8-.24.42-.36.95-.36 1.56 0 .35.06.69.2 1.01.16.4.43.7.84.7.3 0 .58-.1.81-.33.53-.51.31-1.6.31-1.89z"/>
      </svg>
    ),
  },
  flipkart: {
    color: "#2874F0",
    bg: "#EEF4FF",
    border: "#90B8F8",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="#2874F0">
        <path d="M21 3H3C1.9 3 1 3.9 1 5v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 14H4V6h16v11zm-8-9c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
      </svg>
    ),
  },
  croma: {
    color: "#1ABC6E",
    bg: "#EDFFF5",
    border: "#7FDCAE",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="#1ABC6E">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
      </svg>
    ),
  },
  reliance: {
    color: "#C8102E",
    bg: "#FFF0F2",
    border: "#F4A0A8",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="#C8102E">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
  },
};

function getSiteMeta(logo) {
  return SITE_META[logo] || { color: "#6c757d", bg: "#f8f9fa", border: "#dee2e6", icon: null };
}

// ── Skeleton loader for a single site card ────────────────────────────────────
function SiteSkeleton() {
  return (
    <div className="price-compare__site-card price-compare__site-card--loading">
      <div className="price-compare__skeleton price-compare__skeleton--title" />
      <div className="price-compare__skeleton price-compare__skeleton--price" />
      <div className="price-compare__skeleton price-compare__skeleton--btn" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PriceComparison({ productTitle, savedPrice, onClose, autoFetch = false }) {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [searched, setSearched] = useState(false);

  // Auto-fetch on mount when used inside the scraper
  useEffect(() => {
    if (autoFetch && productTitle?.trim()) {
      fetchComparison();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, productTitle]);

  const fetchComparison = async () => {
    if (!productTitle?.trim()) {
      toast.error("Product title is needed for price comparison");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await api.post("/wishlist/compare-prices", {
        title: productTitle,
        savedPrice: savedPrice || null,
      });
      if (data.success) {
        setResult(data);
      } else {
        toast.error(data.message || "Price comparison failed");
      }
    } catch (err) {
      toast.error("Could not fetch price comparison. Please try again.");
      console.error("Price comparison error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-fetch when component mounts ─────────────────────────────────────
  // (call from parent after modal is shown)

  const totalResults = result?.sites?.reduce((acc, s) => acc + s.results.length, 0) || 0;

  return (
    <div className="price-compare">

      {/* Header */}
      <div className="price-compare__header">
        <div className="d-flex align-items-center gap-3">
          <div className="price-compare__header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <div>
            <h6 className="mb-0 fw-bold">Price Comparison</h6>
            <p className="mb-0 text-muted" style={{ fontSize: "0.78rem" }}>
              Searching across Amazon, Flipkart, Croma &amp; Reliance Digital
            </p>
          </div>
        </div>
        {onClose && (
          <button className="btn-close" onClick={onClose} aria-label="Close" />
        )}
      </div>

      {/* Product pill */}
      <div className="price-compare__product-pill">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2 flex-shrink-0">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
        <span className="text-truncate small fw-medium">{productTitle}</span>
        {savedPrice && (
          <span className="ms-auto badge bg-secondary flex-shrink-0">
            Saved: ₹{Number(savedPrice).toLocaleString()}
          </span>
        )}
      </div>

      {/* Savings banner */}
      {result?.savings > 0 && (
        <div className="price-compare__savings-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <strong>Save ₹{result.savings.toLocaleString()} ({result.savingsPercent}% less)</strong>
            <span className="d-block" style={{ fontSize: "0.78rem" }}>
              Best price on {result.lowestSite}: ₹{result.lowestPrice.toLocaleString()}
            </span>
          </div>
          <a href={result.lowestUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-success ms-auto">
            Buy Now
          </a>
        </div>
      )}

      {/* Sites grid */}
      {!searched ? (
        <div className="price-compare__cta">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.2 }}>
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p className="text-muted mt-2 mb-3">Find the best price across top Indian retailers</p>
          <button className="btn btn-primary" onClick={fetchComparison}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
            Compare Prices Now
          </button>
        </div>
      ) : loading ? (
        <div className="price-compare__sites-grid">
          {[0, 1, 2, 3].map((i) => <SiteSkeleton key={i} />)}
        </div>
      ) : result ? (
        <>
          {totalResults === 0 && (
            <div className="alert alert-warning d-flex gap-2 align-items-start py-2 px-3 mb-3" style={{ fontSize: "0.82rem" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-1">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>
                All sites returned bot protection responses. Use the <strong>Search on …</strong> buttons
                to open the site directly in your browser and see live prices.
              </span>
            </div>
          )}

          <div className="price-compare__sites-grid">
            {result.sites.map((site, si) => {
              const meta = getSiteMeta(site.logo);
              const bestResult = site.results[0]; // cheapest shown first (sorted server-side)
              const isLowest = bestResult && result.lowestPrice === bestResult.price;

              return (
                <div
                  key={si}
                  className={`price-compare__site-card ${isLowest ? "price-compare__site-card--best" : ""}`}
                  style={{
                    borderColor: isLowest ? meta.color : meta.border,
                    background: meta.bg,
                  }}
                >
                  {isLowest && (
                    <span
                      className="price-compare__best-badge"
                      style={{ background: meta.color }}
                    >
                      Best Price
                    </span>
                  )}

                  <div className="d-flex align-items-center gap-2 mb-2">
                    {meta.icon}
                    <span className="fw-semibold small" style={{ color: meta.color }}>
                      {site.site}
                    </span>
                  </div>

                  {bestResult ? (
                    <>
                      <div
                        className="price-compare__price"
                        style={{ color: meta.color }}
                      >
                        ₹{bestResult.price.toLocaleString()}
                      </div>
                      <p
                        className="price-compare__item-title"
                        title={bestResult.title}
                      >
                        {bestResult.title.length > 55
                          ? bestResult.title.slice(0, 52) + "…"
                          : bestResult.title}
                      </p>

                      {/* More results from this site */}
                      {site.results.length > 1 && (
                        <div className="price-compare__more-results">
                          {site.results.slice(1, 3).map((r, ri) => (
                            <a
                              key={ri}
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="price-compare__alt-item"
                            >
                              <span className="text-truncate">
                                {r.title.length > 35 ? r.title.slice(0, 32) + "…" : r.title}
                              </span>
                              <span className="fw-semibold text-nowrap" style={{ color: meta.color }}>
                                ₹{r.price.toLocaleString()}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}

                      <a
                        href={bestResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm w-100 mt-2 price-compare__buy-btn"
                        style={{ backgroundColor: meta.color, color: "#fff", border: "none" }}
                      >
                        View on {site.site}
                      </a>
                    </>
                  ) : (
                    <>
                      <div className="d-flex align-items-center gap-1 mb-1">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <span className="small fw-medium" style={{ color: "#b45309" }}>
                          Bot protection active
                        </span>
                      </div>
                      <p className="text-muted" style={{ fontSize: "0.72rem", marginBottom: "0.6rem" }}>
                        {site.site} blocked the server request. Click below to check the price directly.
                      </p>
                      <a
                        href={site.searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm w-100"
                        style={{ background: "transparent", border: `1.5px solid ${meta.color}`, color: meta.color, fontWeight: 600 }}
                      >
                        Search on {site.site} →
                      </a>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Refresh */}
          <div className="text-center mt-3">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={fetchComparison}
              disabled={loading}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Refresh Prices
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
