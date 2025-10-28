/**
 * Script to clean up orphaned goals (goals with deleted users)
 * Usage: node server/cleanup-orphaned-goals.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Goal from './src/models/Goal.js';
import User from './src/models/User.js';

async function cleanupOrphanedGoals() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartgoal');
    console.log('✅ Connected to MongoDB\n');

    // Get all goals
    console.log('📊 Analyzing goals...');
    const allGoals = await Goal.find({}).select('_id userId title createdAt');
    console.log(`   Found ${allGoals.length} total goals\n`);

    // Check each goal's user
    let orphanedCount = 0;
    let validCount = 0;
    const orphanedGoals = [];

    for (const goal of allGoals) {
      if (!goal.userId) {
        console.log(`   ⚠️  Goal "${goal.title}" has null userId`);
        orphanedGoals.push(goal);
        orphanedCount++;
        continue;
      }

      const userExists = await User.findById(goal.userId);
      if (!userExists) {
        console.log(`   ⚠️  Goal "${goal.title}" belongs to deleted user ${goal.userId}`);
        orphanedGoals.push(goal);
        orphanedCount++;
      } else {
        validCount++;
      }
    }

    console.log('\n📈 Analysis Results:');
    console.log(`   ✅ Valid goals: ${validCount}`);
    console.log(`   ⚠️  Orphaned goals: ${orphanedCount}\n`);

    if (orphanedCount === 0) {
      console.log('🎉 No orphaned goals found! Database is clean.');
    } else {
      console.log('🗑️  Orphaned goals to be deleted:');
      orphanedGoals.forEach((goal, index) => {
        console.log(`   ${index + 1}. "${goal.title}" (ID: ${goal._id})`);
      });

      // Ask for confirmation (in production, you'd want user input)
      console.log('\n⚠️  WARNING: This will permanently delete orphaned goals!');
      console.log('   Run this script with --confirm flag to proceed with deletion\n');

      if (process.argv.includes('--confirm')) {
        console.log('🔄 Deleting orphaned goals...');
        const goalIds = orphanedGoals.map(g => g._id);
        const deleteResult = await Goal.deleteMany({ _id: { $in: goalIds } });
        console.log(`✅ Deleted ${deleteResult.deletedCount} orphaned goals\n`);
      } else {
        console.log('ℹ️  No action taken. Use --confirm flag to delete orphaned goals');
        console.log('   Example: node server/cleanup-orphaned-goals.js --confirm\n');
      }
    }

    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error cleaning up orphaned goals:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
cleanupOrphanedGoals();



