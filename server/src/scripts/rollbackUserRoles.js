// Rollback script to remove roles array (if needed)
import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartgoal';

async function rollbackUserRoles() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n⚠️  WARNING: This will remove the roles array from all users!');
    console.log('⚠️  Users will only have the single role field.');
    console.log('\n⏳ Starting rollback in 3 seconds...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Find all users with roles array
    const usersWithRoles = await User.find({
      roles: { $exists: true }
    });

    console.log(`📊 Found ${usersWithRoles.length} users with roles array`);

    if (usersWithRoles.length === 0) {
      console.log('✅ No users have roles array. Nothing to rollback.');
      await mongoose.connection.close();
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithRoles) {
      try {
        // Keep the first role as the single role
        if (user.roles && user.roles.length > 0) {
          user.role = user.roles[0];
        }
        
        // Remove the roles array
        user.roles = undefined;
        
        // Save without validation to avoid schema issues
        await user.save({ validateBeforeSave: false });
        
        successCount++;
        console.log(`✅ Rolled back user: ${user.email}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error rolling back user ${user.email}:`, error.message);
      }
    }

    console.log('\n📈 Rollback Summary:');
    console.log(`   ✅ Successfully rolled back: ${successCount} users`);
    console.log(`   ❌ Failed: ${errorCount} users`);
    console.log(`   📊 Total processed: ${usersWithRoles.length} users`);

    await mongoose.connection.close();
    console.log('\n✅ Rollback completed and database connection closed.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the rollback
console.log('🔄 Starting User Roles Rollback...\n');
rollbackUserRoles();