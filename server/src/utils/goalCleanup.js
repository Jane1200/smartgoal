/**
 * Expired Goals Cleanup Service
 * Handles automatic archiving of goals that have passed their target date
 */

import Goal from '../models/Goal.js';
import User from '../models/User.js';
import { sendExpiredGoalsNotification } from './emailService.js';

/**
 * Clean up expired goals (past target date and not completed)
 * @returns {Object} Cleanup statistics
 */
export async function cleanupExpiredGoals() {
  try {
    const now = new Date();

    // Find active goals that have passed their target date
    const expiredGoals = await Goal.find({
      status: 'active',
      targetDate: { $lt: now }
    });

    if (expiredGoals.length === 0) {
      console.log('No expired goals found');
      return { archived: 0, notified: 0 };
    }

    // Group goals by user
    const goalsByUser = {};
    expiredGoals.forEach(goal => {
      const userId = goal.userId.toString();
      if (!goalsByUser[userId]) {
        goalsByUser[userId] = [];
      }
      goalsByUser[userId].push(goal);
    });

    let archivedCount = 0;
    let notifiedCount = 0;

    // Archive goals and notify users
    for (const [userId, goals] of Object.entries(goalsByUser)) {
      try {
        // Mark goals as expired
        const goalIds = goals.map(goal => goal._id);
        await Goal.updateMany(
          { _id: { $in: goalIds } },
          { 
            $set: { 
              status: 'expired',
              expiredAt: new Date()
            }
          }
        );

        archivedCount += goals.length;

        // Notify the user
        const user = await User.findById(userId);
        if (user && user.email) {
          try {
            await sendExpiredGoalsNotification(user, goals);
            notifiedCount++;
          } catch (emailError) {
            console.error(`Failed to notify user ${user.email}:`, emailError.message);
          }
        }

        console.log(`✅ Archived ${goals.length} expired goals for user ${userId}`);
      } catch (error) {
        console.error(`Error processing goals for user ${userId}:`, error);
      }
    }

    return {
      archived: archivedCount,
      notified: notifiedCount,
      totalUsers: Object.keys(goalsByUser).length
    };
  } catch (error) {
    console.error('Error in cleanup expired goals:', error);
    throw error;
  }
}

/**
 * Get statistics about expired goals
 */
export async function getExpiredGoalsStats() {
  try {
    const now = new Date();

    const [pendingExpired, alreadyExpired, completed] = await Promise.all([
      Goal.countDocuments({
        status: 'active',
        targetDate: { $lt: now }
      }),
      Goal.countDocuments({
        status: 'expired'
      }),
      Goal.countDocuments({
        status: 'completed'
      })
    ]);

    return {
      pendingCleanup: pendingExpired,
      alreadyExpired: alreadyExpired,
      completed: completed,
      total: pendingExpired + alreadyExpired + completed
    };
  } catch (error) {
    console.error('Error getting expired goals stats:', error);
    throw error;
  }
}

/**
 * Get goals nearing expiration (within 7 days)
 */
export async function getGoalsNearingExpiration() {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const nearingExpiration = await Goal.find({
      status: 'active',
      targetDate: { $gte: now, $lte: sevenDaysFromNow }
    }).populate('userId', 'email name');

    return nearingExpiration;
  } catch (error) {
    console.error('Error getting goals nearing expiration:', error);
    throw error;
  }
}
