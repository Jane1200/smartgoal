# 🚀 KNN ML - Quick Start Guide

## ⚡ Fast Setup (2 Commands!)

### **Windows:**

```bash
cd server\python-ml
start.bat
```

### **Mac/Linux:**

```bash
cd server/python-ml
chmod +x start.sh
./start.sh
```

The script will:
1. ✅ Create virtual environment
2. ✅ Install all dependencies
3. ✅ Start the ML service on port 5001

---

## 🔌 Integrate with Your App

### **Step 1: Add Route to Node.js**

Edit `server/src/server.js`:

```javascript
// Add at top with other imports
import mlPricingRoutes from './routes/ml-pricing.js';

// Add with other routes (after authentication routes)
app.use('/api/ml-pricing', mlPricingRoutes);
```

### **Step 2: Restart Node.js Server**

```bash
cd server
npm start
```

### **Step 3: Test Integration**

```bash
# Test from Node.js
curl http://localhost:5000/api/ml-pricing/health
```

---

## 🎨 Use in Frontend

### **Example: Marketplace Listing Form**

```jsx
import KNNPricingSuggestion from '../components/KNNPricingSuggestion';

function MarketplaceForm() {
  const [form, setForm] = useState({
    title: '',
    category: 'electronics',
    condition: 'excellent',
    originalPrice: 65000,
    price: 0,
    location: 'Mumbai',
    purchaseDate: '',
    brand: 'Apple'
  });

  return (
    <form>
      {/* Your existing form fields */}
      
      <div className="form-group">
        <label>Original Price</label>
        <input
          type="number"
          value={form.originalPrice}
          onChange={(e) => setForm({...form, originalPrice: e.target.value})}
        />
      </div>

      {/* KNN Price Suggestion - Auto-populates when inputs change */}
      <KNNPricingSuggestion
        title={form.title}
        category={form.category}
        condition={form.condition}
        originalPrice={form.originalPrice}
        location={form.location}
        ageMonths={calculateAge(form.purchaseDate)}
        brand={extractBrand(form.title) || form.brand}
        onPriceSelect={(suggestedPrice) => {
          // Auto-fill the selling price field
          setForm({ ...form, price: suggestedPrice });
        }}
      />

      <div className="form-group">
        <label>Selling Price</label>
        <input
          type="number"
          value={form.price}
          onChange={(e) => setForm({...form, price: e.target.value})}
        />
      </div>

      {/* Rest of form */}
    </form>
  );
}
```

---

## 🧪 Test It

### **1. Test Python Service Directly:**

```bash
# Health check
curl http://localhost:5001/health

# Get prediction
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "category": "electronics",
    "condition": "excellent",
    "originalPrice": 65000,
    "ageMonths": 24,
    "location": "Mumbai",
    "brand": "Apple"
  }'
```

### **2. Test Through Node.js:**

```bash
curl http://localhost:5000/api/ml-pricing/health

curl -X POST http://localhost:5000/api/ml-pricing/predict \
  -H "Content-Type: application/json" \
  -d '{
    "category": "electronics",
    "condition": "excellent",
    "originalPrice": 65000,
    "ageMonths": 24,
    "location": "Mumbai",
    "brand": "Apple"
  }'
```

### **3. Test in Browser:**

Open your marketplace form and fill in:
- Category: Electronics
- Condition: Excellent
- Original Price: ₹65,000
- Age: 24 months
- Location: Mumbai

Watch the KNN component automatically show price suggestions! 🎉

---

## 📊 What You'll See

```
╔════════════════════════════════════╗
║  AI Price Suggestion (KNN)        ║
╠════════════════════════════════════╣
║  Recommended Price                 ║
║  ₹32,000                          ║
║  [85% Confidence]                 ║
║                                    ║
║  Market Price Range:               ║
║  Min: ₹28,000                     ║
║  Avg: ₹31,500                     ║
║  Max: ₹35,000                     ║
║                                    ║
║  Similar Products Nearby:          ║
║  • iPhone 12 128GB - ₹35,000      ║
║  • iPhone 13 - ₹52,000            ║
║  • iPhone 11 - ₹22,000            ║
║                                    ║
║  [Use This Price] Button          ║
╚════════════════════════════════════╝
```

---

## ✅ Checklist

- [ ] Python service running on port 5001
- [ ] Node.js server running on port 5000
- [ ] ML route added to `server.js`
- [ ] Test `/api/ml-pricing/health` works
- [ ] Import `KNNPricingSuggestion` in your form
- [ ] Add component to marketplace form
- [ ] Test with real data

---

## 🎯 That's It!

Your app now has **real Machine Learning** powered pricing! 🎉

**Next:** Add training data as products sell to improve accuracy!

---

## 💡 Pro Tips

1. **Auto-train on sale**: When item sells, POST to `/api/ml-pricing/train`
2. **Show to users**: Display "AI-powered pricing" badge
3. **A/B test**: Compare manual vs ML pricing
4. **Monitor**: Track confidence scores to improve model

---

**Need Help?** 
- Check `KNN_ML_IMPLEMENTATION_GUIDE.md` for detailed docs
- Check `server/python-ml/README.md` for Python API docs



