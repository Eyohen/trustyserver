// Test script to verify new pricing calculations
const { calculatePrice } = require('./controller/order');

console.log('Testing New Pricing Calculations\n');
console.log('=================================\n');

// Test cases for new pricing
const testCases = [
  {
    name: 'Clean Verbatim - 2 speakers - 3 days',
    specs: { duration: 60, speakers: 2, turnaroundTime: '3days', timestampFrequency: 'none', isVerbatim: false },
    expectedRate: 0.9,
    expectedPrice: 54.00
  },
  {
    name: 'Clean Verbatim - 3 speakers - 1.5 days (NEW RATE)',
    specs: { duration: 60, speakers: 3, turnaroundTime: '1.5days', timestampFrequency: 'none', isVerbatim: false },
    expectedRate: 1.6,
    expectedPrice: 96.00
  },
  {
    name: 'Clean Verbatim - 3 speakers - 6-12hrs (NEW RATE)',
    specs: { duration: 60, speakers: 3, turnaroundTime: '6-12hrs', timestampFrequency: 'none', isVerbatim: false },
    expectedRate: 1.95,
    expectedPrice: 117.00
  },
  {
    name: 'Full Verbatim - 2 speakers - 3 days (NEW RATE)',
    specs: { duration: 60, speakers: 2, turnaroundTime: '3days', timestampFrequency: 'none', isVerbatim: true },
    expectedRate: 1.2,
    expectedPrice: 72.00
  },
  {
    name: 'Full Verbatim - 2 speakers - 1.5 days (NEW RATE)',
    specs: { duration: 60, speakers: 2, turnaroundTime: '1.5days', timestampFrequency: 'none', isVerbatim: true },
    expectedRate: 1.5,
    expectedPrice: 90.00
  },
  {
    name: 'Full Verbatim - 2 speakers - 6-12hrs (NEW RATE)',
    specs: { duration: 60, speakers: 2, turnaroundTime: '6-12hrs', timestampFrequency: 'none', isVerbatim: true },
    expectedRate: 1.8,
    expectedPrice: 108.00
  },
  {
    name: 'Full Verbatim - 3 speakers - 3 days (NEW RATE)',
    specs: { duration: 60, speakers: 3, turnaroundTime: '3days', timestampFrequency: 'none', isVerbatim: true },
    expectedRate: 1.6,
    expectedPrice: 96.00
  },
  {
    name: 'Full Verbatim - 3 speakers - 1.5 days (NEW RATE)',
    specs: { duration: 60, speakers: 3, turnaroundTime: '1.5days', timestampFrequency: 'none', isVerbatim: true },
    expectedRate: 1.95,
    expectedPrice: 117.00
  },
  {
    name: 'Full Verbatim - 3 speakers - 6-12hrs (NEW RATE)',
    specs: { duration: 60, speakers: 3, turnaroundTime: '6-12hrs', timestampFrequency: 'none', isVerbatim: true },
    expectedRate: 2.3,
    expectedPrice: 138.00
  },
  {
    name: 'Test duration rounding (60.5 mins should round to 61)',
    specs: { duration: 60.5, speakers: 2, turnaroundTime: '3days', timestampFrequency: 'none', isVerbatim: false },
    expectedRate: 0.9,
    expectedPrice: 54.90 // 61 * 0.9
  },
  {
    name: 'Test with timestamp modifier',
    specs: { duration: 60, speakers: 2, turnaroundTime: '3days', timestampFrequency: 'speaker', isVerbatim: false },
    expectedRate: 1.2, // 0.9 + 0.3
    expectedPrice: 72.00
  }
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  const result = calculatePrice(test.specs);

  const rateMatch = result.rate === test.expectedRate;
  const priceMatch = result.totalPrice === test.expectedPrice;

  if (rateMatch && priceMatch) {
    console.log(`✅ PASSED - Rate: $${result.rate}/min, Price: $${result.totalPrice}`);
    passed++;
  } else {
    console.log(`❌ FAILED`);
    console.log(`   Expected: Rate=$${test.expectedRate}, Price=$${test.expectedPrice}`);
    console.log(`   Got:      Rate=$${result.rate}, Price=$${result.totalPrice}`);
    failed++;
  }
  console.log('');
});

console.log('=================================');
console.log(`Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
console.log('=================================\n');

if (failed === 0) {
  console.log('✅ All pricing calculations are correct!');
  process.exit(0);
} else {
  console.log('❌ Some pricing calculations failed!');
  process.exit(1);
}
