// Seed script: creates test users for Playwright end-to-end tests
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/smartgoal';

const TEST_PASSWORD = 'Test@1200';

const TEST_USERS = [
  {
    name: 'Goal Setter Test',
    email: 'goalsetter@test.com',
    role: 'goal_setter',
    roles: ['goal_setter'],
  },
  {
    name: 'Buyer Test',
    email: 'buyer@test.com',
    role: 'buyer',
    roles: ['buyer'],
  },
];

async function seedTestUsers() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: 'smartgoal' });
    console.log('✅ Connected to MongoDB\n');

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    for (const userData of TEST_USERS) {
      const existing = await User.findOne({ email: userData.email });

      if (existing) {
        // Update existing user to ensure correct state
        existing.passwordHash = passwordHash;
        existing.role = userData.role;
        existing.roles = userData.roles;
        existing.isVerified = true;
        existing.provider = 'local';
        await existing.save();
        console.log(`✅ Updated existing test user: ${userData.email}`);
      } else {
        await User.create({
          name: userData.name,
          email: userData.email,
          passwordHash,
          role: userData.role,
          roles: userData.roles,
          isVerified: true,
          provider: 'local',
        });
        console.log(`✅ Created test user: ${userData.email}`);
      }

      console.log(`   Role: ${userData.role}`);
      console.log(`   Password: ${TEST_PASSWORD}\n`);
    }

    const count = await User.countDocuments({ email: { $in: TEST_USERS.map(u => u.email) } });
    console.log(`📊 Test users in database: ${count}/${TEST_USERS.length}`);

    await mongoose.connection.close();
    console.log('\n✅ Seeding complete. Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

console.log('🚀 Seeding test users for Playwright tests...\n');
seedTestUsers();
