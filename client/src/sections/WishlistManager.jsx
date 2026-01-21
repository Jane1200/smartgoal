import { useState } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import WishlistScraper from "@/components/WishlistScraper.jsx";
import { FavoriteBorder, Info } from "@mui/icons-material";

export default function WishlistManager() {
  const handleItemAdded = async (newItem) => {
    // Automatically create a goal from the wishlist item
    try {
      console.log('🎯 Creating goal from wishlist item:', newItem);
      await createGoalFromWishlist(newItem);
      toast.success("Goal created successfully! Check 'All Goals' tab to view it.");
    } catch (goalError) {
      console.error('❌ Failed to create goal from wishlist:', goalError);
      toast.error("Failed to create goal. Please try again.");
    }
  };

  // Map wishlist priority to goal category
  const mapWishlistPriorityToGoalCategory = (wishlistPriority) => {
    const categoryMap = {
      high: "essential_purchase",    // High priority → Essential Purchase
      medium: "investment",          // Medium priority → Investment
      low: "investment",             // Low priority → Investment
    };
    return categoryMap[wishlistPriority] || "investment";
  };

  async function createGoalFromWishlist(item) {
    // Sanitize title - remove extra colons and clean up
    let cleanTitle = (item.title || item.itemName || "Wishlist Item")
      .replace(/\s*:\s*Amazon\..*$/i, '') // Remove ": Amazon.in: Electronics" etc
      .replace(/\s*:\s*Flipkart\..*$/i, '') // Remove ": Flipkart..." 
      .replace(/\s*\(.*?\)\s*:\s*.*$/i, '') // Remove "(Bold Black) : Amazon..."
      .replace(/\s*\|.*$/i, '') // Remove "| Amazon.in"
      .replace(/\s*-.*Amazon.*$/i, '') // Remove "- Amazon"
      .replace(/\s*-.*Flipkart.*$/i, '') // Remove "- Flipkart"
      .trim();
    
    // Ensure title meets minimum length
    if (cleanTitle.length < 3) {
      cleanTitle = item.title || item.itemName || "Wishlist Goal";
    }
    
    // Truncate if too long - keep it professional and readable
    if (cleanTitle.length > 50) {
      cleanTitle = cleanTitle.substring(0, 47) + '...';
    }

    // Clean description - remove Amazon/Flipkart suffixes
    let cleanDescription = (item.description || item.notes || "")
      .replace(/\s*:\s*Amazon\..*$/i, '')
      .replace(/\s*:\s*Flipkart\..*$/i, '')
      .trim();
    
    const payload = {
      title: cleanTitle,
      description: cleanDescription || `Wishlist item: ${cleanTitle}`,
      targetAmount: item.price ?? 0,
      currentAmount: 0,
      category: mapWishlistPriorityToGoalCategory(item.priority),
      status: "planned",
      dueDate: item.dueDate || undefined,
      sourceWishlistId: item._id || item.id, // Link to source wishlist item
    };

    console.log("📋 Creating goal from wishlist with cleaned payload:", payload);
    console.log("📋 Original wishlist item title:", item.title);
    console.log("📋 Cleaned goal title:", cleanTitle);

    return api.post("/goals", payload);
  }

  return (
    <>
      <style>{`
        .wishlist-form-card {
          border: none;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          max-width: 800px;
          margin: 0 auto;
        }

        .wishlist-form-card:hover {
          box-shadow: 0 8px 24px rgba(22, 29, 163, 0.12);
        }

        .wishlist-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid rgba(22, 29, 163, 0.1);
        }

        .wishlist-header-icon {
          background: linear-gradient(135deg, #161da3 0%, #4f46e5 100%);
          color: white;
          padding: 1rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wishlist-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .wishlist-subtitle {
          color: #64748b;
          font-size: 0.95rem;
          margin: 0;
        }

        .wishlist-info-box {
          background: rgba(22, 29, 163, 0.05);
          border-left: 4px solid #161da3;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .wishlist-info-box h6 {
          color: #161da3;
          font-weight: 600;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .wishlist-info-box ul {
          margin: 0;
          padding-left: 1.5rem;
          color: #475569;
        }

        .wishlist-info-box li {
          margin-bottom: 0.25rem;
        }
      `}</style>

      <div className="container-fluid" style={{ maxWidth: "900px" }}>
        <div className="card wishlist-form-card">
          <div className="card-body p-4">
            <div className="wishlist-header">
              <div className="wishlist-header-icon">
                <FavoriteBorder style={{ fontSize: '2rem' }} />
              </div>
              <div>
                <h3 className="wishlist-title">Add Product to Wishlist</h3>
                <p className="wishlist-subtitle">Paste a product URL to automatically create a goal</p>
              </div>
            </div>

            <div className="wishlist-info-box">
              <h6>
                <Info fontSize="small" />
                How it works
              </h6>
              <ul>
                <li>Paste a product URL from Amazon, Flipkart, or other supported sites</li>
                <li>We'll automatically extract the product details (title, price, image)</li>
                <li>A goal will be created instantly and appear in your "All Goals" tab</li>
                <li>Track your progress and allocate savings towards your wishlist items</li>
              </ul>
            </div>

            <WishlistScraper onItemAdded={handleItemAdded} />
          </div>
        </div>
      </div>
    </>
  );
}
