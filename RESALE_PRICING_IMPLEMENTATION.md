# 🛠️ Smart Resale Pricing - Implementation Guide

## Overview

The smart resale pricing system is a **client-side calculator** that intelligently suggests fair market prices for resale items based on condition, age, brand, and category. This guide explains the implementation and how to extend it.

---

## 📦 Architecture

```
client/src/
├── utils/
│   ├── pricingCalculator.js        ← Core pricing engine
│   └── validations.js               ← Validation rules (updated)
├── pages/dashboard/
│   └── Marketplace.jsx              ← Main UI integration
└── [other components...]
```

---

## 🔧 Core Components

### 1. **pricingCalculator.js** (Core Engine)

The main pricing calculation engine with these exports:

#### `calculateResalePrice(params)`
Main function that calculates suggested resale price.

**Parameters:**
```javascript
{
  originalPrice: number,          // Original purchase price (required)
  condition: string,              // 'new', 'like-new', 'good', 'fair', 'poor'
  category: string,               // 'electronics', 'fashion', 'sports', 'books', 'other'
  purchaseDate: Date|string,      // When item was purchased (optional)
  brand: string,                  // Item brand (optional)
  title: string,                  // Item title to extract brand (optional)
  demandBoost: number             // Custom multiplier 0.5-1.5 (default 1.0)
}
```

**Returns:**
```javascript
{
  suggested: number,              // Final suggested price
  original: number,               // Original price (echo)
  breakdown: {
    condition: { factor, multiplier, value },
    age: { months, multiplier, value },
    brand: { name, multiplier, isPremium },
    category: { name, multiplier },
    demand: { multiplier, adjusted }
  },
  confidence: number,             // 0-100 confidence score
  percentOfOriginal: number,      // What % of original price
  recommendedRange: {
    min: number,                  // -10% from suggestion
    max: number                   // +10% from suggestion
  }
}
```

#### `getPricingInsight(pricing)`
Returns human-readable insight string:
```javascript
const insight = getPricingInsight(pricing);
// "Item is 6 month(s) old - moderately depreciated | Premium brand retains value well"
```

#### `extractBrand(title)`
Attempts to extract brand name from item title:
```javascript
extractBrand("Apple iPhone 12 Pro Max")  // Returns: "Apple"
extractBrand("Samsung TV 55 inch")       // Returns: "Samsung"
```

#### `getBrandMultiplier(brand)`
Returns premium multiplier for brand:
```javascript
getBrandMultiplier("Apple")     // Returns: 1.15 (premium)
getBrandMultiplier("Generic")   // Returns: 1.0 (neutral)
```

---

### 2. **Marketplace.jsx Integration**

The UI component that integrates pricing calculator.

#### State Management
```javascript
const [listingForm, setListingForm] = useState({
  title: "",
  description: "",
  price: "",
  originalPrice: "",      // NEW
  purchaseDate: "",       // NEW
  category: "",
  condition: "",
  images: []
});

const [pricingSuggestion, setPricingSuggestion] = useState(null);
```

#### Key Function: `updatePricingSuggestion(formData)`
```javascript
const updatePricingSuggestion = (formData) => {
  if (!formData.originalPrice || !formData.condition || !formData.category) {
    setPricingSuggestion(null);
    return;
  }

  try {
    const pricing = calculateResalePrice({
      originalPrice: parseFloat(formData.originalPrice),
      condition: formData.condition,
      category: formData.category,
      purchaseDate: formData.purchaseDate || null,
      title: formData.title
    });

    setPricingSuggestion(pricing);
  } catch (error) {
    console.error('Error calculating pricing:', error);
    setPricingSuggestion(null);
  }
};
```

#### Live Update Trigger
```javascript
// In handleFieldChange()
if (['originalPrice', 'condition', 'category', 'purchaseDate', 'title'].includes(fieldName)) {
  updatePricingSuggestion(updatedForm);
}
```

#### UI Rendering
The pricing suggestion box displays when `pricingSuggestion` is not null:

```jsx
{pricingSuggestion && (
  <div className="col-12">
    <div className="alert alert-info">
      <strong>💡 Smart Pricing Suggestion</strong>
      <div>Suggested Price: ₹{pricingSuggestion.suggested.toLocaleString('en-IN')}</div>
      <div>Value Retained: {pricingSuggestion.percentOfOriginal}%</div>
      <div>Recommended Range: ₹{min} - ₹{max}</div>
      <button onClick={() => handleFieldChange('price', suggestion)}>
        Use Suggested Price
      </button>
    </div>
  </div>
)}
```

---

## 📊 Pricing Algorithm Details

### Condition Multipliers
```javascript
{
  'new': 0.95,
  'like-new': 0.82,
  'good': 0.68,
  'fair': 0.48,
  'poor': 0.28
}
```

### Depreciation Rates (per month)
```javascript
{
  electronics: 0.08,    // 8% per month
  sports: 0.03,         // 3% per month
  books: 0.01,          // 1% per month
  fashion: 0.02,        // 2% per month
  other: 0.04           // 4% per month
}
```

### Demand Multipliers
```javascript
{
  electronics: 1.2,
  fashion: 1.1,
  sports: 1.0,
  books: 0.9,
  other: 0.8
}
```

### Premium Brands
```javascript
{
  electronics: ['Apple', 'Samsung', 'Sony', 'Canon', 'Nikon', ...],
  sports: ['Nike', 'Adidas', 'Puma', ...],
  fashion: ['Tommy Hilfiger', 'Calvin Klein', ...],
  books: ['Penguin', 'Collins', ...]
}
```

### Exponential Decay Formula
```
Depreciation = e^(-rate × months)

Where minimum is 10% (item never reaches 0% value)
```

---

## 🔌 Integration Points

### 1. Form Submission
Currently, the `originalPrice` and `purchaseDate` are **NOT sent to backend**:

```javascript
// In handleSubmitListing()
await api.post("/marketplace/list-item", {
  title: listingForm.title,
  description: listingForm.description,
  price: parseFloat(listingForm.price),  // ← User's chosen price
  category: listingForm.category,
  condition: listingForm.condition,
  images: listingForm.images
  // originalPrice and purchaseDate are NOT sent
});
```

**To store pricing data**, update backend model:

```javascript
// server/src/models/MarketplaceItem.js
const itemSchema = new mongoose.Schema({
  // ... existing fields ...
  price: Number,
  originalPrice: { type: Number, default: null },      // NEW
  purchaseDate: { type: Date, default: null },         // NEW
  // ... rest of schema ...
});
```

Then update API call:
```javascript
await api.post("/marketplace/list-item", {
  // ... existing ...
  originalPrice: listingForm.originalPrice ? parseFloat(listingForm.originalPrice) : null,
  purchaseDate: listingForm.purchaseDate || null
});
```

### 2. Backend Validation (Optional)

Add pricing validation to backend route:
```javascript
// server/src/routes/marketplace.js
router.post('/list-item', async (req, res) => {
  // ... existing validation ...

  // Optional: Validate pricing is reasonable
  if (req.body.originalPrice && req.body.price) {
    const pricingModule = await import('../utils/pricingCalculator.js');
    const suggestion = pricingModule.calculateResalePrice({
      originalPrice: req.body.originalPrice,
      condition: req.body.condition,
      category: req.body.category,
      purchaseDate: req.body.purchaseDate
    });
    
    // Warn if price is way off suggestion
    if (req.body.price > suggestion.recommendedRange.max * 1.5) {
      // Log warning but don't reject
      console.warn(`Price ${req.body.price} significantly above suggestion ${suggestion.suggested}`);
    }
  }
  
  // ... rest of code ...
});
```

### 3. Display Pricing Data (Optional)

When showing listings, can display pricing context:
```javascript
// In listing cards/detail view
{item.originalPrice && (
  <div className="text-muted small">
    <span>Original: ₹{item.originalPrice.toLocaleString('en-IN')} | </span>
    <span>Retained: {Math.round((item.price / item.originalPrice) * 100)}%</span>
  </div>
)}
```

---

## 🧪 Testing the Calculator

### Manual Testing in Browser Console

```javascript
// Import the calculator
import { calculateResalePrice } from './pricingCalculator.js';

// Test case 1: New iPhone
const result1 = calculateResalePrice({
  originalPrice: 50000,
  condition: 'new',
  category: 'electronics',
  purchaseDate: new Date().toISOString(),
  title: 'Apple iPhone 12 Pro Max'
});

console.log('Suggested:', result1.suggested);
console.log('Confidence:', result1.confidence);
console.log('Breakdown:', result1.breakdown);

// Test case 2: Used Samsung TV
const result2 = calculateResalePrice({
  originalPrice: 25000,
  condition: 'good',
  category: 'electronics',
  purchaseDate: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000), // 12 months ago
  title: 'Samsung 55 inch TV'
});

console.log('Suggested:', result2.suggested);
```

### Unit Test Example (Jest)

```javascript
// __tests__/pricingCalculator.test.js
import { calculateResalePrice, extractBrand, getBrandMultiplier } from '../pricingCalculator';

describe('pricingCalculator', () => {
  test('calculates price for new premium item', () => {
    const result = calculateResalePrice({
      originalPrice: 50000,
      condition: 'new',
      category: 'electronics',
      title: 'Apple iPhone'
    });
    
    expect(result.suggested).toBeGreaterThan(40000);
    expect(result.percentOfOriginal).toBeGreaterThan(80);
  });

  test('extracts brand from title', () => {
    expect(extractBrand('Apple iPhone 12')).toBe('Apple');
    expect(extractBrand('Samsung TV')).toBe('Samsung');
  });

  test('applies premium multiplier for Apple', () => {
    expect(getBrandMultiplier('Apple')).toBe(1.15);
    expect(getBrandMultiplier('Generic')).toBe(1.0);
  });
});
```

---

## 📈 Performance Considerations

### Current Performance
- Calculation time: **<5ms** per suggestion
- No API calls in client
- Pure synchronous calculation
- Suitable for real-time typing

### Optimization Tips
1. **Debounce updates** if needed:
```javascript
// Use custom hook or library
const debouncedUpdate = useCallback(
  debounce((data) => updatePricingSuggestion(data), 300),
  []
);
```

2. **Cache calculations**:
```javascript
const [calculationCache, setCache] = useState({});

const updatePricingSuggestion = (formData) => {
  const cacheKey = `${formData.originalPrice}-${formData.condition}-${formData.category}`;
  if (calculationCache[cacheKey]) {
    setPricingSuggestion(calculationCache[cacheKey]);
    return;
  }
  // ... calculate ...
};
```

---

## 🔐 Security Considerations

### Current (Safe)
- All calculations happen client-side
- No sensitive data sent to external APIs
- User retains full control over final price
- No lock-in to suggested price

### If Storing Pricing Data
- Validate `originalPrice` range on backend
- Validate `purchaseDate` is not in future
- Use pricing suggestion as **advisory only**
- Log extreme outliers for fraud detection

---

## 🎯 Future Enhancements

### 1. ML-Based Pricing
```javascript
// Future: Train model on completed transactions
const { predictPrice } = await import('./ml/pricingModel.js');
const mlPrice = predictPrice({
  // ... same params ...
});
```

### 2. Market Trends
```javascript
// Future: Factor in trending items
const trend = await api.get('/marketplace/trends', {
  category: 'electronics',
  brand: 'Apple'
});
```

### 3. Historical Data
```javascript
// Future: Use past sales data
const avgSellingPrice = await api.get('/marketplace/category-average', {
  category: formData.category
});
```

### 4. Similar Listings
```javascript
// Future: Compare to active listings
const similar = await api.get('/marketplace/similar', {
  title: formData.title,
  category: formData.category
});
```

---

## 📝 Configuration

### To Update Multipliers

Edit `pricingCalculator.js`:

```javascript
// Change condition depreciation
const CONDITION_MULTIPLIERS = {
  'new': 0.95,        // ← Adjust these
  'like-new': 0.82,
  // ...
};

// Change depreciation rates
const DEPRECIATION_RATES = {
  electronics: 0.08,  // ← 8% per month (change to 0.06 for 6%)
  // ...
};

// Add new premium brands
PREMIUM_BRANDS.electronics.push('GoPro');
```

### To Add New Category

1. Add to validation rules (`validations.js`):
```javascript
category: {
  enum: ["electronics", "fashion", "sports", "books", "collectibles", "other"],
  // ...
}
```

2. Add to pricing multipliers:
```javascript
DEPRECIATION_RATES.collectibles = 0.0;  // No depreciation
DEMAND_MULTIPLIERS.collectibles = 1.5;  // High demand
```

3. Update UI (Marketplace.jsx):
```jsx
<option value="collectibles">Collectibles</option>
```

---

## 🚀 Deployment Checklist

- [ ] Test with sample data in staging
- [ ] Verify calculations match business rules
- [ ] Update backend schema if storing pricing data
- [ ] Add input validation for all new fields
- [ ] Test on mobile devices
- [ ] Document in user guide
- [ ] Train support team on pricing logic
- [ ] Monitor for edge cases in production

---

## 📞 Support & Debugging

### Common Issues

**Issue: Suggestion box not showing**
```javascript
// Debug: Check these conditions
console.log('Original Price:', formData.originalPrice); // Must be > 100
console.log('Condition:', formData.condition);          // Must be valid enum
console.log('Category:', formData.category);             // Must be valid enum
```

**Issue: Suggestion seems wrong**
```javascript
// Debug: Check the breakdown
console.log('Full Result:', pricingSuggestion.breakdown);
// Review each multiplier individually
```

**Issue: Performance is slow**
```javascript
// Check update frequency
// Should be <5ms per keystroke
// If slower, check for other event handlers
```

---

## 📚 Related Files

- `RESALE_PRICING_GUIDE.md` - User-facing guide
- `client/src/utils/pricingCalculator.js` - Engine
- `client/src/pages/dashboard/Marketplace.jsx` - UI
- `client/src/utils/validations.js` - Validation rules

---

## ✅ Implementation Status

- ✅ Core pricing calculator implemented
- ✅ UI integration in Marketplace
- ✅ Live suggestion updates
- ✅ Premium brand detection
- ✅ Age-based depreciation
- ✅ Category demand factors
- ⏳ Backend storage (optional, not yet done)
- ⏳ ML-based pricing (future)
- ⏳ Market trend integration (future)

---

## 💬 Questions?

Refer to the main `RESALE_PRICING_GUIDE.md` for user documentation, or review the code comments in `pricingCalculator.js` for technical details.