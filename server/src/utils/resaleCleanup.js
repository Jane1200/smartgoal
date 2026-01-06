/**
 * Expired Resale Items Cleanup Service
 * Handles automatic cleanup of marketplace listings older than 90 days
 */

import Marketplace from '../models/Marketplace.js';
import User from '../models/User.js';
import { sendExpiredResaleNotification } from './emailService.js';

/**
 * Clean up expired resale items (older than 90 days)
 * @returns {Object} Cleanup statistics
 */
export async function cleanupExpiredResaleItems() {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Find unsold items older than 90 days
    const expiredItems = await Marketplace.find({
      status: 'available',
      createdAt: { $lt: ninetyDaysAgo }
    });

    if (expiredItems.length === 0) {
      console.log('No expired resale items found');
      return { cleaned: 0, notified: 0 };
    }

    // Group items by seller
    const itemsBySeller = {};
    expiredItems.forEach(item => {
      const sellerId = item.sellerId.toString();
      if (!itemsBySeller[sellerId]) {
        itemsBySeller[sellerId] = [];
      }
      itemsBySeller[sellerId].push(item);
    });

    let cleanedCount = 0;
    let notifiedCount = 0;

    // Mark items as expired and notify sellers
    for (const [sellerId, items] of Object.entries(itemsBySeller)) {
      try {
        // Mark items as expired
        const itemIds = items.map(item => item._id);
        await Marketplace.updateMany(
          { _id: { $in: itemIds } },
          { 
            $set: { 
              status: 'expired',
              expiredAt: new Date()
            }
          }
        );

        cleanedCount += items.length;

        // Notify the seller
        const seller = await User.findById(sellerId);
        if (seller && seller.email) {
          try {
            await sendExpiredResaleNotification(seller, items);
            notifiedCount++;
          } catch (emailError) {
            console.error(`Failed to notify seller ${seller.email}:`, emailError.message);
          }
        }

        console.log(`✅ Marked ${items.length} items as expired for seller ${sellerId}`);
      } catch (error) {
        console.error(`Error processing items for seller ${sellerId}:`, error);
      }
    }

    return {
      cleaned: cleanedCount,
      notified: notifiedCount,
      totalSellers: Object.keys(itemsBySeller).length
    };
  } catch (error) {
    console.error('Error in cleanup expired resale items:', error);
    throw error;
  }
}

/**
 * Get statistics about expired items
 */
export async function getExpiredItemsStats() {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [available, expired] = await Promise.all([
      Marketplace.countDocuments({
        status: 'available',
        createdAt: { $lt: ninetyDaysAgo }
      }),
      Marketplace.countDocuments({
        status: 'expired'
      })
    ]);

    return {
      pendingCleanup: available,
      alreadyExpired: expired,
      total: available + expired
    };
  } catch (error) {
    console.error('Error getting expired items stats:', error);
    throw error;
  }
}
