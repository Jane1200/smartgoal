# SmartGoal CV Price Estimation — Training Guide

## Complete Step-by-Step Instructions

---

## STEP 1 — Set Up Environment

Open terminal in `resale_price_estimation/` folder:

```bash
# Activate virtual environment (already created)
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install all dependencies
pip install -r requirements.txt
```

---

## STEP 2 — Get Datasets from Kaggle

### 2a. Set up Kaggle API
1. Go to https://www.kaggle.com/settings
2. Click **API** → **Create New Token**
3. A file `kaggle.json` downloads
4. Place it at: `C:\Users\<your-name>\.kaggle\kaggle.json`

```bash
pip install kaggle
```

### 2b. Download Price Dataset (Tabular)
```bash
# Used Phones & Laptops dataset (has brand, age, specs, price)
kaggle datasets download -d ahsan81/used-handheld-device-data -p data/datasets/
cd data/datasets && unzip used-handheld-device-data.zip && cd ../..
```

### 2c. Download Image Dataset (for Condition Detection)

**Option A — Phone Condition Images:**
```bash
kaggle datasets download -d scolians/phone-condition-dataset -p data/raw_images/
```

**Option B — Search for your own:**
```bash
kaggle datasets search "used phone images condition"
kaggle datasets search "laptop condition scratch damage"
```

**Option C — Manual collection (recommended for accuracy):**
Create folders and add your own images:
```
data/raw_images/
  poor/        ← 100+ images of heavily damaged phones/laptops
  fair/        ← 100+ images with visible wear/scratches
  good/        ← 100+ images with minor signs of use
  excellent/   ← 100+ images of barely used devices
  new/         ← 100+ images of brand new devices
```
You can download images from:
- Google Images (search "damaged iPhone screen", "used laptop scratches", etc.)
- OLX / Quikr listings
- Refurbished store websites

---

## STEP 3 — Prepare the Dataset

```bash
python src/data_preparation/prepare_dataset.py
```

This will:
- Split images into train/val/test folders (70/15/15 split)
- Generate synthetic tabular data (or process your Kaggle CSV)
- Show a summary of what was created

Expected output:
```
✅ poor: 120 images → train=84, val=18, test=18
✅ fair: 150 images → train=105, val=22, test=23
✅ good: 200 images → train=140, val=30, test=30
✅ excellent: 180 images → train=126, val=27, test=27
✅ new: 100 images → train=70, val=15, test=15

✅ Generated 5000 training samples → data/datasets/price_training_data.csv
```

---

## STEP 4 — Train the Condition Detection Model

```bash
python src/training/train_condition_model.py
```

Training takes:
- **With GPU (CUDA):** ~5-10 minutes
- **CPU only:** ~30-60 minutes

Expected output:
```
Epoch  1/20 | Train Loss: 1.4231  Acc: 0.4821 | Val Loss: 1.2103  Acc: 0.5214
Epoch  5/20 | Train Loss: 0.8123  Acc: 0.7234 | Val Loss: 0.7891  Acc: 0.7512
Epoch  6/20 | Unfreezing backbone for full fine-tuning...
Epoch 10/20 | Train Loss: 0.5234  Acc: 0.8123 | Val Loss: 0.5891  Acc: 0.7923
Epoch 20/20 | Train Loss: 0.3212  Acc: 0.8934 | Val Loss: 0.4231  Acc: 0.8312

✅ New best model saved (val_acc=0.8312)
Model saved to: models/condition_model/condition_model.pth
```

**Note:** You need at least 50 images per class. More = better accuracy.

---

## STEP 5 — Train the Price Model

```bash
python src/training/train_price_model.py
```

Training takes ~30 seconds (XGBoost is fast).

Expected output:
```
Model Performance on Test Set:
  MAE  (Mean Absolute Error):  ₹2,341
  RMSE (Root Mean Sq. Error):  ₹3,892
  R²   (Explained Variance):   0.8923
  MAPE (Mean Abs % Error):      8.23%

Feature Importance:
  original_price           ████████████████ 0.4231
  condition_score          ████████████     0.3012
  age_months               ████             0.1023
  ...

Sample Predictions:
  Apple      phone  | Age: 18mo | Original: ₹80,000  | → ₹52,340
  Samsung    phone  | Age: 24mo | Original: ₹50,000  | → ₹28,120
  Dell       laptop | Age: 30mo | Original: ₹70,000  | → ₹38,920
  Apple      laptop | Age: 12mo | Original: ₹1,50,000 | → ₹1,12,500
```

---

## STEP 6 — Start the API

```bash
python api.py
```

The API runs on port **5002**.

Test it:
```bash
# Health check
curl http://localhost:5002/health

# Test price estimation (without image)
curl -X POST http://localhost:5002/estimate \
  -F "brand=Apple" \
  -F "category=phone" \
  -F "original_price=80000" \
  -F "age_months=18"

# Test with image
curl -X POST http://localhost:5002/estimate \
  -F "image=@/path/to/iphone.jpg" \
  -F "brand=Apple" \
  -F "category=phone" \
  -F "original_price=80000" \
  -F "age_months=18"
```

---

## STEP 7 — Connect to SmartGoal Marketplace

The SmartGoal backend at `server/.env` already has:
```
ML_SERVICE_URL=http://localhost:5002
```

The marketplace listing page will automatically call `/estimate` when:
1. User uploads an item image
2. User fills in brand, original price, age

The estimated price auto-fills the price field.

---

## Improving Accuracy

| What to do | Impact |
|-----------|--------|
| Add 500+ images per class | High |
| Use real Kaggle price data | High |
| Fine-tune for 30+ epochs | Medium |
| Add GPU training (CUDA) | Speed |
| Collect brand-specific data | Medium |

---

## Folder Structure After Training

```
resale_price_estimation/
  models/
    condition_model/
      condition_model.pth        ← trained ResNet50
      training_history.json      ← loss/accuracy curves
    price_model/
      price_model.pkl            ← trained XGBoost
      model_metrics.json         ← MAE, R², MAPE
      feature_importance.json    ← which features matter most
  data/
    processed_images/
      train/poor/ fair/ good/ excellent/ new/
      val/...
      test/...
    datasets/
      price_training_data.csv
  logs/
    api.log
```
