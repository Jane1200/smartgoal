// Migration script to add roles array to existing users
import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartgoal';

async function migrateUserRoles() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users that don't have a roles array or have an empty roles array
    const usersToMigrate = await User.find({
      $or: [
        { roles: { $exists: false } },
        { roles: { $size: 0 } },
        { roles: null }
      ]
    });

    console.log(`\n📊 Found ${usersToMigrate.length} users to migrate`);

    if (usersToMigrate.length === 0) {
      console.log('✅ No users need migration. All users already have roles array.');
      await mongoose.connection.close();
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersToMigrate) {
      try {
        // Get the user's current role or default to 'goal_setter'
        const currentRole = user.role || 'goal_setter';
        
        // Set the roles array
        user.roles = [currentRole];
        
        // Ensure the legacy role field is also set
        user.role = currentRole;
        
        // Save the user (this will trigger pre-save hooks)
        await user.save();
        
        successCount++;
        console.log(`✅ Migrated user: ${user.email} (${currentRole})`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating user ${user.email}:`, error.message);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount} users`);
    console.log(`   ❌ Failed: ${errorCount} users`);
    console.log(`   📊 Total processed: ${usersToMigrate.length} users`);

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const usersWithoutRoles = await User.countDocuments({
      $or: [
        { roles: { $exists: false } },
        { roles: { $size: 0 } },
        { roles: null }
      ]
    });

    if (usersWithoutRoles === 0) {
      console.log('✅ Migration verified! All users now have roles array.');
    } else {
      console.log(`⚠️  Warning: ${usersWithoutRoles} users still don't have roles array.`);
    }

    // Show role distribution
    console.log('\n📊 Role Distribution:');
    const roleStats = await User.aggregate([
      { $unwind: '$roles' },
      { $group: { _id: '$roles', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    roleStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} users`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Migration completed and database connection closed.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the migration
console.log('🚀 Starting User Roles Migration...\n');
migrateUserRoles();