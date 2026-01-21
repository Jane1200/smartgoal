// Initialize the evaluator account
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/smartgoal';

// Evaluator credentials
const EVALUATOR_EMAIL = 'evaluator@smartgoal.com';
const EVALUATOR_PASSWORD = 'Evaluator@123';
const EVALUATOR_NAME = 'Smart Goal Evaluator';

async function initializeEvaluator() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if evaluator already exists
    let evaluator = await User.findOne({ email: EVALUATOR_EMAIL });

    if (evaluator) {
      console.log(`\n✅ Evaluator account already exists: ${EVALUATOR_EMAIL}`);
      
      // Update evaluator to ensure they have correct roles
      let needsUpdate = false;
      
      if (!evaluator.roles || !evaluator.roles.includes('evaluator')) {
        evaluator.roles = ['evaluator'];
        evaluator.role = 'evaluator';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await evaluator.save();
        console.log('✅ Evaluator account updated with correct roles');
      }
      
      console.log('\n📋 Evaluator Details:');
      console.log(`   Email: ${evaluator.email}`);
      console.log(`   Name: ${evaluator.name}`);
      console.log(`   Role: ${evaluator.role}`);
      console.log(`   Roles: ${evaluator.roles.join(', ')}`);
      console.log(`   Verified: ${evaluator.isVerified}`);
      console.log(`   Created: ${evaluator.createdAt}`);
      console.log(`\n🔐 Password: ${EVALUATOR_PASSWORD}`);
      
    } else {
      console.log(`\n🔨 Creating evaluator account: ${EVALUATOR_EMAIL}`);
      
      // Hash the password
      const passwordHash = await bcrypt.hash(EVALUATOR_PASSWORD, 10);
      
      // Create evaluator user
      evaluator = await User.create({
        name: EVALUATOR_NAME,
        email: EVALUATOR_EMAIL,
        passwordHash: passwordHash,
        role: 'evaluator',
        roles: ['evaluator'],
        isVerified: true,
        provider: 'local'
      });
      
      console.log('✅ Evaluator account created successfully!');
      console.log('\n📋 Evaluator Details:');
      console.log(`   Email: ${evaluator.email}`);
      console.log(`   Name: ${evaluator.name}`);
      console.log(`   Role: ${evaluator.role}`);
      console.log(`   Roles: ${evaluator.roles.join(', ')}`);
      console.log(`   Password: ${EVALUATOR_PASSWORD}`);
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
console.log('🚀 Initializing Evaluator Account...\n');
console.log('📧 Evaluator Email: ' + EVALUATOR_EMAIL);
console.log('🔐 Evaluator Password: ' + EVALUATOR_PASSWORD);
console.log('');
initializeEvaluator();
