import { generateTransactionHash } from './src/utils/duplicateDetector.js';

// Test cases for duplicate detection
const testTransactions = [
  {
    amount: 1500.00,
    date: new Date('2024-01-15'),
    type: 'expense',
    description: 'Grocery Shopping',
    category: 'food'
  },
  {
    amount: 1500,
    date: new Date('2024-01-15'),
    type: 'expense',
    description: 'Grocery Shopping',
    category: 'food'
  },
  {
    amount: 50000,
    date: new Date('2024-01-01'),
    type: 'income',
    source: 'salary',
    description: 'Monthly Salary'
  },
  {
    amount: 50000.00,
    date: new Date('2024-01-01'),
    type: 'income',
    source: 'salary',
    description: 'Monthly Salary'
  },
  {
    amount: 200,
    date: new Date('2024-01-10'),
    type: 'expense',
    category: 'transport',
    description: ''
  },
  {
    amount: 200.00,
    date: new Date('2024-01-10'),
    type: 'expense',
    category: 'transport',
    description: ''
  }
];

console.log('🧪 Testing Duplicate Detection\n');
console.log('=' .repeat(80));

const hashes = new Map();

testTransactions.forEach((transaction, index) => {
  console.log(`\n📝 Transaction ${index + 1}:`);
  console.log(`   Amount: ₹${transaction.amount}`);
  console.log(`   Date: ${transaction.date.toLocaleDateString()}`);
  console.log(`   Type: ${transaction.type}`);
  console.log(`   Description: "${transaction.description || transaction.source || transaction.category}"`);
  
  const hash = generateTransactionHash(transaction);
  console.log(`   Hash: ${hash}`);
  
  if (hashes.has(hash)) {
    console.log(`   ❌ DUPLICATE of Transaction ${hashes.get(hash) + 1}`);
  } else {
    console.log(`   ✅ NEW transaction`);
    hashes.set(hash, index);
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Summary:`);
console.log(`   Total transactions: ${testTransactions.length}`);
console.log(`   Unique transactions: ${hashes.size}`);
console.log(`   Duplicates: ${testTransactions.length - hashes.size}`);
console.log('\n✅ Test completed!\n');
