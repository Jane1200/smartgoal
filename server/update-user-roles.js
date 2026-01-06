/**
 * Script to update specific users to have both goal_setter and buyer roles
 * Usage: node server/update-user-roles.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/User.js';

// Users to update (by email)
const usersToUpdate = [
  'janeantony1200@gmail.com',      // Mary Jane
  'reenaantony@gmail.com',          // Reena Antony
  'janemaryantony2026@mca.ajce.in', // JANE MARY ANTONY
  'janeantony120@gmail.com'         // Jane Antony
];

async function updateUserRoles() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartgoal');
    console.log('✅ Connected to MongoDB\n');

    // Update each user
    for (const email of usersToUpdate) {
      console.log(`📧 Updating user: ${email}`);
      
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        console.log(`   ❌ User not found: ${email}\n`);
        continue;
      }

      // Check current roles
      const currentRoles = user.roles || [user.role || 'goal_setter'];
      console.log(`   Current roles: ${currentRoles.join(', ')}`);

      // Update to have both roles
      const newRoles = ['goal_setter', 'buyer'];
      user.roles = newRoles;
      user.role = 'goal_setter'; // Keep primary role as goal_setter
      
      await user.save();
      
      console.log(`   ✅ Updated to: ${newRoles.join(', ')}`);
      console.log(`   Primary role: ${user.role}\n`);
    }

    console.log('✨ All users updated successfully!');
    
    // Verify updates
    console.log('\n📊 Verification:');
    for (const email of usersToUpdate) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        console.log(`   ${user.name} (${user.email}): ${user.roles.join(', ')}`);
      }
    }

    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error updating user roles:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
updateUserRoles();











