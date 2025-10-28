# 🚀 Quick Start: KNN Buyer-Seller Matching

**Get AI-powered matching running in 5 minutes!**

---

## ⚡ Quick Steps

### 1️⃣ Start ML Service (Port 5001)

```bash
cd server/python-ml
.\start.bat    # Windows
```

**Expected Output:**
```
🎯 Starting KNN Pricing Service on port 5001
📊 Training samples: 20
✅ Model trained successfully
🌐 Access the service at: http://localhost:5001
```

---

### 2️⃣ Test Matching (Optional)

```bash
# In a NEW terminal (keep ML service running!)
cd server/python-ml
python test_matching.py
```

**Expected Output:**
```
🎯 Found 6 matched sellers

1. iPhone 11 128GB (White)
   Match Score: 95.2%
   ✓ Within Budget | ⭐ RECOMMENDED
```

---

### 3️⃣ Start Node.js Server (Port 5000)

```bash
cd server
npm start
```

---

### 4️⃣ Start React Client (Port 5173)

```bash
cd client
npm run dev
```

---

### 5️⃣ Add to Your Buyer Page

**Example: In `client/src/pages/dashboard/BuyerMarketplace.jsx`**

```jsx
import MatchedSellers from '../../components/MatchedSellers';
import { useState, useEffect } from 'react';

function BuyerMarketplace() {
  const [userLocation, setUserLocation] = useState(null);
  const [sellers, setSellers] = useState([]);
  
  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      });
    }
  }, []);
  
  // Fetch available sellers from your API
  useEffect(() => {
    const fetchSellers = async () => {
      const response = await fetch('/api/marketplace/items');
      const data = await response.json();
      setSellers(data.items);
    };
    fetchSellers();
  }, []);
  
  return (
    <div>
      <h1>Find Your Perfect Match</h1>
      
      {/* KNN Matching Component */}
      {userLocation && sellers.length > 0 && (
        <MatchedSellers
          buyerLatitude={userLocation.latitude}
          buyerLongitude={userLocation.longitude}
          budgetMin={10000}
          budgetMax={30000}
          preferredCategory="phone"
          preferredCondition="excellent"
          maxDistance={10}
          sellers={sellers}
        />
      )}
    </div>
  );
}
```

---

## 🧪 Test the Endpoint Directly

### Using PowerShell:

```powershell
$body = @{
  sellers = @(
    @{
      sellerId = "test1"
      sellerName = "Test Seller"
      productId = "prod1"
      productTitle = "iPhone 12"
      productPrice = 32000
      productCategory = "phone"
      productCondition = "excellent"
      latitude = 9.9312
      longitude = 76.2673
      location = "Kochi"
    }
  )
  buyer = @{
    latitude = 9.9252
    longitude = 76.2667
    budgetMin = 25000
    budgetMax = 35000
    preferredCategory = "phone"
    maxDistance = 10
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:5000/api/ml-pricing/match-sellers" -Method POST -Body $body -ContentType "application/json"
```

### Using Browser (visit this URL after starting servers):

```
http://localhost:5001/health
```

**Should show:**
```json
{
  "status": "running",
  "service": "SmartGoal KNN Pricing Service",
  "version": "1.0.0",
  "model_trained": true
}
```

---

## 📊 Sample Integration Code

### Complete Example:

```jsx
import React, { useState, useEffect } from 'react';
import MatchedSellers from '../../components/MatchedSellers';
import axios from 'axios';

const BuyerDashboard = () => {
  const [location, setLocation] = useState({ lat: 9.9252, lng: 76.2667 });
  const [budget, setBudget] = useState({ min: 10000, max: 30000 });
  const [category, setCategory] = useState('phone');
  const [sellers, setSellers] = useState([]);
  
  // Fetch sellers from your marketplace API
  useEffect(() => {
    const loadSellers = async () => {
      try {
        const response = await axios.get('/api/marketplace/items');
        setSellers(response.data.items || []);
      } catch (error) {
        console.error('Failed to load sellers:', error);
      }
    };
    loadSellers();
  }, []);
  
  return (
    <div className="p-6">
      {/* Budget Filter */}
      <div className="mb-6 flex gap-4">
        <input
          type="number"
          placeholder="Min Budget"
          value={budget.min}
          onChange={(e) => setBudget({ ...budget, min: e.target.value })}
          className="px-4 py-2 border rounded"
        />
        <input
          type="number"
          placeholder="Max Budget"
          value={budget.max}
          onChange={(e) => setBudget({ ...budget, max: e.target.value })}
          className="px-4 py-2 border rounded"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="phone">Phone</option>
          <option value="laptop">Laptop</option>
          <option value="tablet">Tablet</option>
        </select>
      </div>
      
      {/* KNN Matching */}
      <MatchedSellers
        buyerLatitude={location.lat}
        buyerLongitude={location.lng}
        budgetMin={budget.min}
        budgetMax={budget.max}
        preferredCategory={category}
        preferredCondition="good"
        maxDistance={10}
        sellers={sellers}
      />
    </div>
  );
};

export default BuyerDashboard;
```

---

## 🎯 Expected UI

Once integrated, buyers will see:

```
╔═══════════════════════════════════════════════╗
║ 🎯 Matched Sellers Near You                  ║
║                                               ║
║ Found 5 sellers • 3 highly recommended        ║
║                                               ║
║ ┌────────┬────────┬──────────┬──────────┐   ║
║ │ Avg    │ Avg    │ Within   │ Within   │   ║
║ │ Dist   │ Price  │ Budget   │ Range    │   ║
║ │ 1.8 km │ ₹32.4k │ 4        │ 5        │   ║
║ └────────┴────────┴──────────┴──────────┘   ║
╚═══════════════════════════════════════════════╝

┌─────────────────────────────────────────┐
│ ⭐ HIGHLY RECOMMENDED                   │
├─────────────────────────────────────────┤
│ 📱 iPhone 11 128GB (White)              │
│ 👤 Priya Sharma                         │
│ 📍 Ernakulam, Kerala • 0.67 km away     │
│ 💰 ₹28,000                              │
│                                          │
│ Match Score: 95% ████████████████░░░░   │
│                                          │
│ ✓ Within Budget | ✓ Within Range       │
│                                          │
│ [Contact Seller] [View Details]        │
└─────────────────────────────────────────┘
```

---

## ✅ Verification Checklist

Run these commands to verify everything is working:

```bash
# 1. Check ML service
curl http://localhost:5001/health

# 2. Check Node.js API
curl http://localhost:5000/api/ml-pricing/health

# 3. Run matching test
cd server/python-ml
python test_matching.py

# 4. Check React client
# Open browser: http://localhost:5173
```

---

## 🐛 Common Issues

### Issue 1: ML Service Not Running
**Error:** `Connection refused on port 5001`

**Fix:**
```bash
cd server/python-ml
.\start.bat
# Wait for "Access the service at: http://localhost:5001"
```

---

### Issue 2: No Matches Found
**Error:** Empty matches array

**Check:**
- ✅ Sellers have valid latitude/longitude
- ✅ `maxDistance` is reasonable (try 20 km)
- ✅ Budget range is wide enough
- ✅ Sellers array is not empty

---

### Issue 3: Import Error in Python
**Error:** `ModuleNotFoundError: No module named 'sklearn'`

**Fix:**
```bash
cd server/python-ml
venv\Scripts\activate
pip install -r requirements.txt
```

---

### Issue 4: CORS Error in Browser
**Error:** `CORS policy: No 'Access-Control-Allow-Origin'`

**Fix:** Make sure Node.js server is running with CORS enabled
```javascript
// Already handled in server/src/server.js
app.use(cors());
```

---

## 🎉 You're Done!

Your SmartGoal marketplace now has **AI-powered matching**! 🚀

**Next Steps:**
1. ✅ Integrate into your buyer dashboard
2. ✅ Add user location detection
3. ✅ Customize match score weights
4. ✅ Add real seller data from MongoDB

---

## 📞 Need Help?

1. **Check logs:** Look for errors in terminal windows
2. **Test endpoint:** Run `python test_matching.py`
3. **Verify services:** All 3 must be running (ML, Node, React)
4. **Review docs:** See `KNN_BUYER_SELLER_MATCHING.md`

---

**Happy Matching! 🎯**




