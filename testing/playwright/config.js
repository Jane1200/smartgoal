/**
 * Test Configuration
 * 
 * IMPORTANT: Update the test user emails below to match users in your database!
 * These users MUST exist and have the correct roles assigned.
 */

export const config = {
  // Base URLs - Update if your app runs on different ports
  baseUrl: 'http://localhost:5173',  // Client URL
  apiUrl: 'http://localhost:5000',   // Server URL
  
  // Test users - UPDATE THESE TO MATCH YOUR ACTUAL TEST USERS!
  users: {
    goalSetter: {
      email: 'goalsetter@test.com',  // ← Goal setter email
      password: 'Test@1200',          // ← Correct password
      name: 'Goal Setter Test',
      role: 'goal_setter'
    },
    buyer: {
      email: 'buyer@test.com',        // ← Buyer email
      password: 'Test@1200',          // ← Correct password
      name: 'Buyer Test',
      role: 'buyer'
    },
    newUser: {
      email: `newuser${Date.now()}@test.com`,
      password: 'Test@1200',
      name: 'New User Test'
    }
  },
  
  // Test data
  testData: {
    goal: {
      title: 'Test Vacation Fund',
      description: 'Saving for family vacation to Goa',
      targetAmount: '50000',
      category: 'discretionary'
    },
    wishlist: {
      title: 'Test iPhone 15 Pro',
      price: '129900',
      priority: 'medium'
    },
    marketplace: {
      title: 'Test MacBook Air M2',
      description: 'Excellent condition, barely used',
      originalPrice: '120000',
      price: '95000',
      condition: 'excellent',
      category: 'electronics'
    }
  }
};

export default config;

