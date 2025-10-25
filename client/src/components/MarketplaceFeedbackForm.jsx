import { useState } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

export default function MarketplaceFeedbackForm({ itemId, sellerId, itemTitle, orderId, onSubmitSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState({
    quality: 0,
    description: 0,
    communication: 0,
    shipping: 0
  });
  const [isGenuine, setIsGenuine] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!rating) {
      toast.error("Please select a rating");
      return;
    }

    if (comment.length < 5) {
      toast.error("Please write at least 5 characters");
      return;
    }

    if (comment.length > 500) {
      toast.error("Comment must not exceed 500 characters");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(`/marketplace/feedback/${itemId}`, {
        rating,
        categoryRatings,
        isGenuine,
        comment,
        orderId
      });

      toast.success("Thank you for your feedback!");
      setSubmitted(true);
      
      // Reset form
      setRating(0);
      setCategoryRatings({ quality: 0, description: 0, communication: 0, shipping: 0 });
      setIsGenuine(true);
      setComment("");

      // Notify parent component
      if (onSubmitSuccess) {
        onSubmitSuccess(response.data);
      }
    } catch (error) {
      console.error("Feedback submission error:", error);
      toast.error(error.response?.data?.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="alert alert-success d-flex align-items-center" role="alert">
        <svg className="me-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <div>
          <strong>Thank you!</strong> Your feedback has been submitted successfully.
        </div>
      </div>
    );
  }

  const RatingStars = ({ value, onChange, onHover, onLeave }) => {
    return (
      <div className="d-flex gap-2 align-items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => onHover(star)}
            onMouseLeave={onLeave}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "2rem",
              color: star <= (hoveredRating || value) ? "#FFB812" : "#ddd",
              transition: "color 0.2s"
            }}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="marketplace-feedback-form">
      <div className="card border-light shadow-sm">
        <div className="card-body">
          <h5 className="card-title mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Share Your Feedback
          </h5>
          
          <form onSubmit={handleSubmit}>
            {/* Item Info */}
            <div className="mb-3 p-2 bg-light rounded small">
              <strong>Item:</strong> {itemTitle}
            </div>

            {/* Overall Rating */}
            <div className="mb-4">
              <label className="form-label fw-medium">Overall Rating *</label>
              <div className="mb-2">
                <RatingStars
                  value={rating}
                  onChange={setRating}
                  onHover={setHoveredRating}
                  onLeave={() => setHoveredRating(0)}
                />
              </div>
              <small className="text-muted d-block">
                {rating === 0 && "Click to rate"}
                {rating === 1 && "Very Poor"}
                {rating === 2 && "Poor"}
                {rating === 3 && "Average"}
                {rating === 4 && "Good"}
                {rating === 5 && "Excellent"}
              </small>
            </div>

            {/* Category Ratings (Optional) */}
            <div className="mb-4">
              <label className="form-label fw-medium">Category Ratings (optional)</label>
              {Object.entries({
                quality: "Product Quality",
                description: "Listing Description Accuracy",
                communication: "Seller Communication",
                shipping: "Shipping Speed"
              }).map(([key, label]) => (
                <div key={key} className="mb-2">
                  <label className="form-label small text-muted mb-1">{label}</label>
                  <input
                    type="range"
                    className="form-range"
                    min="0"
                    max="5"
                    value={categoryRatings[key]}
                    onChange={(e) =>
                      setCategoryRatings({
                        ...categoryRatings,
                        [key]: parseInt(e.target.value)
                      })
                    }
                  />
                  <small className="text-muted">
                    {categoryRatings[key] === 0 ? "Not rated" : `${categoryRatings[key]} stars`}
                  </small>
                </div>
              ))}
            </div>

            {/* Genuine Item Checkbox */}
            <div className="mb-4">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="isGenuine"
                  checked={isGenuine}
                  onChange={(e) => setIsGenuine(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="isGenuine">
                  <strong>This item is genuine and as described</strong>
                  {rating === 5 && isGenuine && (
                    <span className="badge bg-success ms-2">Auto-Verified ✓</span>
                  )}
                </label>
              </div>
              <small className="text-muted d-block mt-1">
                Marking genuine items helps us identify trusted sellers
              </small>
            </div>

            {/* Comment */}
            <div className="mb-4">
              <label htmlFor="comment" className="form-label fw-medium">
                Your Feedback *
                <span className="small text-muted ms-2">
                  ({comment.length}/500 characters)
                </span>
              </label>
              <textarea
                id="comment"
                className="form-control"
                rows="4"
                placeholder="Share your experience with this product and seller... (minimum 5 characters)"
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
              />
              <small className="text-muted d-block mt-1">
                {comment.length < 5
                  ? `Need at least ${5 - comment.length} more character${5 - comment.length > 1 ? "s" : ""}`
                  : "✓ Ready to submit"}
              </small>
            </div>

            {/* Submit Button */}
            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !rating || comment.length < 5}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}