import Goal from "../models/Goal.js";
import Marketplace from "../models/Marketplace.js";
import Notification from "../models/Notification.js";

/**
 * Find marketplace items that match user's electronics goals
 * @param {String} userId - User ID
 * @returns {Array} Array of matched items with goal info
 */
export async function findMarketplaceMatchesForGoals(userId) {
  try {
    // Get user's active electronics goals
    const electronicsGoals = await Goal.find({
      userId,
      status: { $in: ["planned", "in_progress"] },
      category: { $in: ["electronics", "essential_purchase", "discretionary"] }
    });

    if (electronicsGoals.length === 0) {
      return [];
    }

    const matches = [];

    for (const goal of electronicsGoals) {
      // Search marketplace for items matching this goal
      const marketplaceItems = await Marketplace.find({
        status: "active",
        category: "electronics",
        // Price should be within goal's budget (with 20% flexibility)
        price: { 
          $gte: goal.targetAmount * 0.5, 
          $lte: goal.targetAmount * 1.2 
        }
      })
      .populate("userId", "name email avatar trustBadge")
      .limit(5)
      .sort({ createdAt: -1 });

      if (marketplaceItems.length > 0) {
        matches.push({
          goal: {
            _id: goal._id,
            title: goal.title,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentAmount,
            progress: goal.progress
          },
          items: marketplaceItems.map(item => ({
            ...item.toObject(),
            potentialSavings: Math.max(0, goal.targetAmount - item.price)
          }))
        });
      }
    }

    return matches;
  } catch (error) {
    console.error("Error finding marketplace matches:", error);
    return [];
  }
}

/**
 * Link marketplace sale to seller's goal
 * @param {String} marketplaceItemId - Marketplace item ID
 * @param {String} goalId - Goal ID
 * @returns {Object} Updated marketplace item and goal
 */
export async function linkSaleToGoal(marketplaceItemId, goalId) {
  try {
    const item = await Marketplace.findById(marketplaceItemId);
    const goal = await Goal.findById(goalId);

    if (!item || !goal) {
      throw new Error("Item or goal not found");
    }

    // Verify ownership
    if (item.userId.toString() !== goal.userId.toString()) {
      throw new Error("Item and goal must belong to the same user");
    }

    // Link item to goal
    item.linkedGoalBySeller = goalId;
    await item.save();

    return { item, goal };
  } catch (error) {
    console.error("Error linking sale to goal:", error);
    throw error;
  }
}

/**
 * Process marketplace purchase and update linked goal
 * @param {String} marketplaceItemId - Marketplace item ID
 * @param {String} buyerId - Buyer user ID
 * @param {String} goalId - Optional goal ID to link purchase to
 * @returns {Object} Updated item and goal (if linked)
 */
export async function processPurchaseWithGoal(marketplaceItemId, buyerId, goalId = null) {
  try {
    const item = await Marketplace.findById(marketplaceItemId);
    
    if (!item) {
      throw new Error("Marketplace item not found");
    }

    if (item.status !== "active") {
      throw new Error("Item is not available for purchase");
    }

    // Mark item as sold
    item.status = "sold";
    item.soldAt = new Date();
    item.buyerId = buyerId;

    let updatedGoal = null;
    let sellerGoalUpdated = null;

    // Handle buyer's goal (if linked)
    if (goalId) {
      const buyerGoal = await Goal.findOne({ _id: goalId, userId: buyerId });
      
      if (buyerGoal) {
        // Link purchase to buyer's goal
        item.linkedGoalByBuyer = goalId;
        
        // Mark goal as completed
        buyerGoal.status = "completed";
        buyerGoal.currentAmount = buyerGoal.targetAmount;
        buyerGoal.purchasedFromMarketplace = true;
        buyerGoal.linkedMarketplaceItem = marketplaceItemId;
        buyerGoal.marketplacePurchaseDate = new Date();
        
        // Calculate savings (if user had a higher target amount)
        if (buyerGoal.targetAmount > item.price) {
          buyerGoal.marketplaceSavings = buyerGoal.targetAmount - item.price;
        }
        
        await buyerGoal.save();
        updatedGoal = buyerGoal;

        // Create notification for buyer
        await Notification.create({
          userId: buyerId,
          type: "success",
          title: "Goal Completed! 🎉",
          message: `Your goal "${buyerGoal.title}" has been completed with your marketplace purchase!`,
          actionUrl: "/goals",
          actionLabel: "View Goals"
        });
      }
    }

    // Handle seller's goal (if linked)
    if (item.linkedGoalBySeller) {
      const sellerGoal = await Goal.findById(item.linkedGoalBySeller);
      
      if (sellerGoal) {
        // Add sale proceeds to seller's goal
        sellerGoal.currentAmount += item.price;
        item.contributedToGoal = true;
        item.goalContributionAmount = item.price;
        
        // Check if goal is now completed
        if (sellerGoal.currentAmount >= sellerGoal.targetAmount) {
          sellerGoal.status = "completed";
          sellerGoal.currentAmount = sellerGoal.targetAmount;
        } else {
          sellerGoal.status = "in_progress";
        }
        
        await sellerGoal.save();
        sellerGoalUpdated = sellerGoal;

        // Create notification for seller
        await Notification.create({
          userId: item.userId,
          type: "success",
          title: "Item Sold! 💰",
          message: `Your ${item.title} sold for ₹${item.price.toLocaleString()}. Funds added to "${sellerGoal.title}" goal!`,
          actionUrl: "/goals",
          actionLabel: "View Goals"
        });
      }
    }

    await item.save();

    return {
      item,
      buyerGoal: updatedGoal,
      sellerGoal: sellerGoalUpdated
    };
  } catch (error) {
    console.error("Error processing purchase with goal:", error);
    throw error;
  }
}

/**
 * Notify user about new marketplace items matching their goals
 * @param {String} userId - User ID
 */
export async function notifyUserAboutMarketplaceMatches(userId) {
  try {
    const matches = await findMarketplaceMatchesForGoals(userId);

    if (matches.length === 0) {
      return;
    }

    // Create notification for each goal with matches
    for (const match of matches) {
      const totalMatches = match.items.length;
      const bestMatch = match.items[0]; // First item (most recent)

      await Notification.create({
        userId,
        type: "info",
        title: "Found in Marketplace! 💡",
        message: `We found ${totalMatches} item${totalMatches > 1 ? 's' : ''} matching your goal "${match.goal.title}". Best match: ${bestMatch.title} for ₹${bestMatch.price.toLocaleString()}`,
        actionUrl: "/marketplace",
        actionLabel: "Browse Items"
      });
    }
  } catch (error) {
    console.error("Error notifying about marketplace matches:", error);
  }
}

/**
 * Get marketplace contribution statistics for a user
 * @param {String} userId - User ID
 * @returns {Object} Statistics
 */
export async function getMarketplaceGoalStats(userId) {
  try {
    // Goals completed via marketplace
    const goalsCompletedViaMarketplace = await Goal.countDocuments({
      userId,
      purchasedFromMarketplace: true,
      status: "completed"
    });

    // Total savings from buying used
    const savingsFromMarketplace = await Goal.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId),
          purchasedFromMarketplace: true
        }
      },
      {
        $group: {
          _id: null,
          totalSavings: { $sum: "$marketplaceSavings" }
        }
      }
    ]);

    // Goals funded by selling
    const goalsFundedBySelling = await Marketplace.countDocuments({
      userId,
      status: "sold",
      contributedToGoal: true
    });

    // Total funds raised from selling
    const fundsRaisedFromSelling = await Marketplace.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId),
          status: "sold",
          contributedToGoal: true
        }
      },
      {
        $group: {
          _id: null,
          totalFunds: { $sum: "$goalContributionAmount" }
        }
      }
    ]);

    return {
      goalsCompletedViaMarketplace,
      totalSavingsFromBuying: savingsFromMarketplace[0]?.totalSavings || 0,
      goalsFundedBySelling,
      totalFundsFromSelling: fundsRaisedFromSelling[0]?.totalFunds || 0,
      totalMarketplaceContribution: 
        (savingsFromMarketplace[0]?.totalSavings || 0) + 
        (fundsRaisedFromSelling[0]?.totalFunds || 0)
    };
  } catch (error) {
    console.error("Error getting marketplace goal stats:", error);
    return {
      goalsCompletedViaMarketplace: 0,
      totalSavingsFromBuying: 0,
      goalsFundedBySelling: 0,
      totalFundsFromSelling: 0,
      totalMarketplaceContribution: 0
    };
  }
}

export default {
  findMarketplaceMatchesForGoals,
  linkSaleToGoal,
  processPurchaseWithGoal,
  notifyUserAboutMarketplaceMatches,
  getMarketplaceGoalStats
};
