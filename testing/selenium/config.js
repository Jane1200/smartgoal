/**
 * Selenium Test Configuration
 * Configure your test settings here
 */

export const config = {
  // Application URLs
  baseUrl: 'http://localhost:5173', // Vite dev server (client)
  apiUrl: 'http://localhost:5000', // Express API server
  
  // Test user credentials (create a test user or use existing)
  testUser: {
    email: 'test@example.com',
    password: 'Test@123',
    name: 'Test User'
  },
  
  // Browser settings
  browser: {
    name: 'chrome',
    headless: false, // Set to true for CI/CD
    windowSize: { width: 1920, height: 1080 }
  },
  
  // Timeouts (in milliseconds)
  timeouts: {
    implicit: 10000,
    pageLoad: 30000,
    script: 30000,
    element: 10000
  },
  
  // Test data
  testData: {
    goal: {
      title: 'Test Vacation Fund',
      description: 'Saving for a family vacation',
      targetAmount: 50000,
      category: 'discretionary'
    },
    wishlist: {
      title: 'Test Product',
      price: 25000,
      url: 'https://www.amazon.in/test-product',
      priority: 'medium'
    },
    finance: {
      income: {
        amount: 50000,
        source: 'Salary',
        category: 'Regular Income'
      },
      expense: {
        amount: 15000,
        category: 'Groceries'
      }
    }
  },
  
  // Screenshot settings
  screenshots: {
    onFailure: true,
    onSuccess: false,
    directory: './screenshots'
  },
  
  // Reporting
  report: {
    directory: './reports',
    format: 'html' // html, json, or both
  }
};

export default config;

