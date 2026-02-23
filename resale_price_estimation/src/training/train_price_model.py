"""
Price Model Training Script
============================
Trains a GradientBoostingRegressor on price_training_data.csv (5000 rows).
Also incorporates used_device_data.csv from Kaggle for validation insight.

Dataset schema (price_training_data.csv):
  brand, category, age_months, original_price, condition_score,
  condition_label, ram_gb, storage_gb, has_original_box, num_repairs,
  resale_price

Run:
    cd resale_price_estimation
    python src/training/train_price_model.py
"""

import sys
import logging
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score
import pickle

# ── Paths ────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[2]
DATA_DIR  = ROOT / "data" / "datasets"
MODEL_DIR = ROOT / "models" / "price_model"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

PRICE_CSV = DATA_DIR / "price_training_data.csv"
DEVICE_CSV_ZIP = DATA_DIR / "used-handheld-device-data" / "used_device_data.csv"
MODEL_PATH = MODEL_DIR / "price_model.pkl"
META_PATH  = MODEL_DIR / "metadata.pkl"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


# ── Brand & category encodings (must match estimator.py) ─────────────────────
BRANDS = [
    "Apple", "Samsung", "OnePlus", "Xiaomi", "Oppo", "Vivo",
    "Dell", "HP", "Lenovo", "Asus", "Acer", "Other",
]
CATEGORIES = ["phone", "laptop"]
CONDITION_LABELS = ["poor", "fair", "good", "excellent", "new"]


def encode_brand(brand: str) -> int:
    brand = brand.strip().title()
    known = {b: i for i, b in enumerate(BRANDS)}
    return known.get(brand, len(BRANDS) - 1)  # unknown → "Other"


def encode_category(cat: str) -> int:
    cat = cat.lower().strip()
    return 1 if cat == "laptop" else 0


def encode_condition_label(label: str) -> int:
    label = label.lower().strip()
    return CONDITION_LABELS.index(label) if label in CONDITION_LABELS else 2


# ── Feature engineering ───────────────────────────────────────────────────────
def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Transform raw CSV rows into the feature matrix."""
    f = pd.DataFrame()

    f["brand_enc"]        = df["brand"].apply(encode_brand)
    f["category_enc"]     = df["category"].apply(encode_category)
    f["age_months"]       = df["age_months"].astype(float)
    f["age_years"]        = f["age_months"] / 12.0
    f["original_price"]   = df["original_price"].astype(float)
    f["condition_score"]  = df["condition_score"].astype(float)
    f["condition_label_enc"] = df["condition_label"].apply(encode_condition_label)
    f["ram_gb"]           = df.get("ram_gb", pd.Series(0, index=df.index)).astype(float).fillna(0)
    f["storage_gb"]       = df.get("storage_gb", pd.Series(128, index=df.index)).astype(float).fillna(128)
    f["has_original_box"] = df.get("has_original_box", pd.Series(0, index=df.index)).astype(int).fillna(0)
    f["num_repairs"]      = df.get("num_repairs", pd.Series(0, index=df.index)).astype(int).fillna(0)

    # Engineered features
    f["depreciation_rate"] = f["original_price"] / (f["age_years"] + 0.1)
    f["condition_age_interact"] = f["condition_score"] * (1 / (f["age_years"] + 0.5))
    f["price_per_gb_storage"] = f["original_price"] / (f["storage_gb"] + 1)
    f["is_laptop"] = (f["category_enc"] == 1).astype(int)

    return f


def load_and_prepare() -> tuple:
    """Load CSV, engineer features, split into train/val/test."""
    logger.info(f"Loading dataset: {PRICE_CSV}")
    df = pd.read_csv(PRICE_CSV)
    logger.info(f"Dataset shape: {df.shape}")
    logger.info(f"Condition label distribution:\n{df['condition_label'].value_counts().to_string()}")
    logger.info(f"Category distribution:\n{df['category'].value_counts().to_string()}")

    # Drop rows with missing target
    df = df.dropna(subset=["resale_price"])
    logger.info(f"After dropping NaN targets: {df.shape[0]} rows")

    X = build_features(df)
    y = df["resale_price"].astype(float).values

    logger.info(f"\nFeature matrix shape: {X.shape}")
    logger.info(f"Target: resale_price | mean=₹{y.mean():.0f} | std=₹{y.std():.0f} | range=[₹{y.min():.0f}, ₹{y.max():.0f}]")

    X_train, X_test, y_train, y_test = train_test_split(
        X.values, y, test_size=0.15, random_state=42
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train, y_train, test_size=0.15, random_state=42
    )

    logger.info(f"Split: train={len(X_train)}, val={len(X_val)}, test={len(X_test)}")
    return X_train, X_val, X_test, y_train, y_val, y_test, list(X.columns)


def train(X_train, y_train) -> GradientBoostingRegressor:
    """Train the GradientBoostingRegressor."""
    logger.info("\nTraining GradientBoostingRegressor...")

    model = GradientBoostingRegressor(
        n_estimators=400,
        learning_rate=0.08,
        max_depth=5,
        min_samples_split=10,
        min_samples_leaf=4,
        subsample=0.85,
        max_features="sqrt",
        loss="huber",          # robust to outliers
        random_state=42,
        verbose=0,
    )

    model.fit(X_train, y_train)
    logger.info("Training complete.")
    return model


def evaluate(model, X, y, split_name: str) -> dict:
    preds = model.predict(X)
    mae  = mean_absolute_error(y, preds)
    r2   = r2_score(y, preds)
    mape = float(np.mean(np.abs((y - preds) / (y + 1e-5))) * 100)
    rmse = float(np.sqrt(np.mean((y - preds) ** 2)))

    logger.info(f"\n── {split_name} Metrics ─────────────────────")
    logger.info(f"  MAE  : ₹{mae:.0f}")
    logger.info(f"  RMSE : ₹{rmse:.0f}")
    logger.info(f"  MAPE : {mape:.1f}%")
    logger.info(f"  R²   : {r2:.4f}")
    return {"mae": mae, "rmse": rmse, "mape": mape, "r2": r2}


def feature_importance(model, feature_names: list):
    importances = model.feature_importances_
    ranked = sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)
    logger.info("\n── Feature Importance ──────────────────────")
    for name, imp in ranked:
        bar = "█" * int(imp * 100)
        logger.info(f"  {name:<30} {imp:.4f}  {bar}")


def main():
    X_train, X_val, X_test, y_train, y_val, y_test, feature_names = load_and_prepare()

    model = train(X_train, y_train)

    evaluate(model, X_train, y_train, "Train")
    evaluate(model, X_val,   y_val,   "Validation")
    test_metrics = evaluate(model, X_test, y_test, "Test")

    feature_importance(model, feature_names)

    # Save model
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)

    # Save metadata (feature names + encodings needed at inference time)
    metadata = {
        "feature_names": feature_names,
        "brands": BRANDS,
        "categories": CATEGORIES,
        "condition_labels": CONDITION_LABELS,
        "test_metrics": test_metrics,
    }
    with open(META_PATH, "wb") as f:
        pickle.dump(metadata, f)

    logger.info(f"\n✅ Model saved → {MODEL_PATH}")
    logger.info(f"✅ Metadata saved → {META_PATH}")
    logger.info(f"\nTest MAE: ₹{test_metrics['mae']:.0f}  R²: {test_metrics['r2']:.4f}")
    return model


if __name__ == "__main__":
    main()
