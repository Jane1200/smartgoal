// Initialize the single admin account
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/smartgoal';

// Single admin credentials
const ADMIN_EMAIL = 'smartgoaladmin12@gmail.com';
const ADMIN_PASSWORD = 'Admin@SmartGoal';
const ADMIN_NAME = 'Smart Goal Admin';

async function initializeAdmin() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    let admin = await User.findOne({ email: ADMIN_EMAIL });

    if (admin) {
      console.log(`\n✅ Admin account already exists: ${ADMIN_EMAIL}`);
      
      // Update admin to ensure they have correct roles
      let needsUpdate = false;
      
      if (!admin.roles || !admin.roles.includes('admin')) {
        admin.roles = ['admin'];
        admin.role = 'admin';
        needsUpdate = true;
      }
      
      // Update password if needed (optional - uncomment if you want to reset password)
      // const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      // if (admin.passwordHash !== passwordHash) {
      //   admin.passwordHash = passwordHash;
      //   needsUpdate = true;
      // }
      
      if (needsUpdate) {
        await admin.save();
        console.log('✅ Admin account updated with correct roles');
      }
      
      console.log('\n📋 Admin Details:');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Roles: ${admin.roles.join(', ')}`);
      console.log(`   Verified: ${admin.isVerified}`);
      console.log(`   Created: ${admin.createdAt}`);
      
    } else {
      console.log(`\n🔨 Creating admin account: ${ADMIN_EMAIL}`);
      
      // Hash the password
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      // Create admin user
      admin = await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash: passwordHash,
        role: 'admin',
        roles: ['admin'],
        isVerified: true,
        provider: 'local'
      });
      
      console.log('✅ Admin account created successfully!');
      console.log('\n📋 Admin Details:');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Roles: ${admin.roles.join(', ')}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
    }

    // Verify there's only one admin
    const adminCount = await User.countDocuments({ roles: 'admin' });
    console.log(`\n📊 Total admin accounts in database: ${adminCount}`);
    
    if (adminCount > 1) {
      console.log('\n⚠️  WARNING: Multiple admin accounts detected!');
      const allAdmins = await User.find({ roles: 'admin' }).select('email name createdAt');
      console.log('   Admin accounts:');
      allAdmins.forEach((adm, idx) => {
        console.log(`   ${idx + 1}. ${adm.email} (${adm.name}) - Created: ${adm.createdAt}`);
      });
      console.log('\n   Consider removing extra admin accounts if they are not needed.');
    }

    await mongoose.connection.close();
    console.log('\n✅ Initialization completed and database connection closed.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the initialization
console.log('🚀 Initializing Admin Account...\n');
console.log('📧 Admin Email: ' + ADMIN_EMAIL);
console.log('🔐 Admin Password: ' + ADMIN_PASSWORD);
console.log('');
initializeAdmin();