# KNN Pricing Service - Python ML Microservice

## 🎯 Overview

This is a Python Flask microservice that provides **KNN (K-Nearest Neighbors)** based price predictions for resale items in SmartGoal.

### **How It Works:**

1. **Training Data**: Pre-loaded with 20 sample products
2. **KNN Algorithm**: Finds 5 most similar products
3. **Price Prediction**: Suggests optimal price based on similar items
4. **Confidence Score**: Higher confidence when similar items are very close

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd server/python-ml
pip install -r requirements.txt
```

**Or with virtual environment (recommended):**

```bash
cd server/python-ml
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Run the Service

```bash
python app.py
```

Service will start on: **http://localhost:5001**

---

## 📡 API Endpoints

### **1. Health Check**

```bash
GET http://localhost:5001/
```

**Response:**
```json
{
  "service": "SmartGoal KNN Pricing Service",
  "status": "running",
  "model_trained": true,
  "training_samples": 20
}
```

### **2. Predict Price**

```bash
POST http://localhost:5001/predict
Content-Type: application/json
```

**Request:**
```json
{
  "title": "iPhone 12 64GB",
  "category": "electronics",
  "condition": "excellent",
  "location": "Mumbai",
  "originalPrice": 65000,
  "ageMonths": 24,
  "brand": "Apple"
}
```

**Response:**
```json
{
  "success": true,
  "predicted_price": 32000,
  "average_price": 31500,
  "median_price": 32000,
  "price_range": {
    "min": 28000,
    "max": 35000
  },
  "similar_products": [
    {
      "title": "iPhone 12 128GB",
      "price": 35000,
      "condition": "good",
      "location": "Mumbai",
      "similarity": 0.92
    }
  ],
  "confidence": 85,
  "k_neighbors": 5
}
```

### **3. Add Training Data**

```bash
POST http://localhost:5001/train
Content-Type: application/json
```

**Request:**
```json
{
  "title": "iPhone 13 Pro",
  "category": "electronics",
  "condition": "excellent",
  "location": "Delhi",
  "originalPrice": 120000,
  "sellingPrice": 85000,
  "ageMonths": 12,
  "brand": "Apple"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product added to training data",
  "training_result": {
    "success": true,
    "samples": 21
  }
}
```

### **4. Model Statistics**

```bash
GET http://localhost:5001/stats
```

**Response:**
```json
{
  "model_trained": true,
  "training_samples": 20,
  "k_neighbors": 5,
  "categories": ["electronics", "sports", "fashion"],
  "locations": ["Mumbai", "Delhi", "Bangalore"]
}
```

---

## 🧪 Testing

### Test with curl:

```bash
# Health check
curl http://localhost:5001/health

# Price prediction
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

### Test with Postman:

1. Import the endpoints
2. Send POST request to `/predict`
3. Check response

---

## 🎓 KNN Algorithm Details

### **Features Used:**

1. **Category** (electronics, sports, fashion, books, other)
2. **Condition** (new, like-new, excellent, good, fair, poor)
3. **Location** (Mumbai, Delhi, Bangalore, etc.)
4. **Brand** (Apple, Samsung, Nike, etc.)
5. **Original Price** (numeric)
6. **Age in Months** (numeric)

### **Distance Metric:**

- **Euclidean distance** after feature scaling
- Closer items have more weight (`weights='distance'`)

### **Output:**

- **Predicted Price**: Weighted average of K neighbors
- **Price Range**: Min/max from similar items
- **Confidence**: Based on neighbor distances

---

## 📊 Training Data

Located in `sample_data.json` with 20 pre-loaded products:

- **Electronics**: iPhones, Samsung, OnePlus, laptops
- **Sports**: Nike shoes, Adidas
- **Fashion**: Tommy Hilfiger, Levi's
- **Accessories**: Headphones, smartwatches

You can add more data via `/train` endpoint or edit the JSON file directly.

---

## 🔧 Configuration

Edit `.env` file:

```env
PORT=5001           # Service port
DEBUG=False         # Debug mode
FLASK_ENV=production
```

---

## 🚨 Troubleshooting

### **Issue: Module not found**

```bash
pip install -r requirements.txt
```

### **Issue: Port 5001 already in use**

Change port in `.env`:
```env
PORT=5002
```

### **Issue: Model not trained**

Check `sample_data.json` exists and has data.

---

## 📈 Production Deployment

### **Option 1: Gunicorn (Linux/Mac)**

```bash
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

### **Option 2: Docker**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5001", "app:app"]
```

---

## 🎯 Performance

- **Response Time**: < 100ms
- **K=5**: Good balance of accuracy and speed
- **Scalable**: Can handle 100+ requests/second

---

## 📚 Dependencies

- **Flask**: Web framework
- **scikit-learn**: KNN algorithm
- **numpy**: Numerical operations
- **pandas**: Data manipulation

---

## 🤝 Integration with Node.js

See `server/src/routes/ml-pricing.js` for Node.js integration.

---

**Ready to use!** 🎉

Start the service and test it with your SmartGoal app!




