"""
Dataset Preparation Script
Run this AFTER downloading your Kaggle datasets.

Organizes images into:
  data/
    train/
      poor/        ← damaged/heavily scratched images
      fair/        ← visible wear
      good/        ← minor signs of use
      excellent/   ← barely used
      new/         ← brand new in box
    val/
      (same 5 classes)
    test/
      (same 5 classes)

Also generates a synthetic tabular dataset for price training if you
don't have a real price CSV.
"""

import os
import shutil
import random
import csv
import json
from pathlib import Path
import pandas as pd
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw_images"
PROCESSED_DIR = ROOT / "data" / "processed_images"
DATASET_DIR = ROOT / "data" / "datasets"

SPLITS = {"train": 0.70, "val": 0.15, "test": 0.15}
CLASSES = ["poor", "fair", "good", "excellent", "new"]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


# ─── Image Dataset Organizer ────────────────────────────────────────────────

def organize_images(source_dir: Path = RAW_DIR):
    """
    Organizes images from source_dir into train/val/test splits.

    Expected source_dir layout (one folder per condition class):
      raw_images/
        poor/    ← images of damaged items
        fair/
        good/
        excellent/
        new/

    OR flat folder with filenames like:
      item_001_good.jpg
      item_002_poor.jpg
    """
    print(f"\n📁 Organizing images from: {source_dir}")

    for split in SPLITS:
        for cls in CLASSES:
            (PROCESSED_DIR / split / cls).mkdir(parents=True, exist_ok=True)

    total = 0
    for cls in CLASSES:
        cls_dir = source_dir / cls
        if not cls_dir.exists():
            print(f"  ⚠️  Folder not found: {cls_dir} — skipping")
            continue

        images = [
            f for f in cls_dir.iterdir()
            if f.suffix.lower() in IMAGE_EXTENSIONS
        ]
        random.shuffle(images)

        n = len(images)
        n_train = int(n * SPLITS["train"])
        n_val = int(n * SPLITS["val"])

        splits_assignment = (
            [("train", img) for img in images[:n_train]] +
            [("val", img) for img in images[n_train:n_train + n_val]] +
            [("test", img) for img in images[n_train + n_val:]]
        )

        for split, img_path in splits_assignment:
            dest = PROCESSED_DIR / split / cls / img_path.name
            shutil.copy2(img_path, dest)

        print(f"  ✅ {cls}: {n} images → train={n_train}, val={n_val}, test={n - n_train - n_val}")
        total += n

    print(f"\n✅ Total images organized: {total}")
    return total


# ─── Tabular Dataset Generator ──────────────────────────────────────────────

BRANDS_PHONES = ["Apple", "Samsung", "OnePlus", "Xiaomi", "Oppo", "Vivo", "Realme"]
BRANDS_LAPTOPS = ["Dell", "HP", "Lenovo", "Apple", "Asus", "Acer", "MSI"]

PHONE_PRICES = {
    "Apple": (50000, 150000),
    "Samsung": (20000, 100000),
    "OnePlus": (25000, 80000),
    "Xiaomi": (8000, 40000),
    "Oppo": (10000, 45000),
    "Vivo": (8000, 40000),
    "Realme": (7000, 35000),
}

LAPTOP_PRICES = {
    "Dell": (35000, 120000),
    "HP": (30000, 110000),
    "Lenovo": (30000, 100000),
    "Apple": (80000, 200000),
    "Asus": (35000, 130000),
    "Acer": (25000, 90000),
    "MSI": (60000, 200000),
}

CONDITION_SCORE_RANGES = {
    "poor": (5, 25),
    "fair": (26, 45),
    "good": (46, 65),
    "excellent": (66, 85),
    "new": (86, 100),
}


def _compute_resale_price(
    original_price: float,
    age_months: int,
    condition_score: int,
    has_box: bool,
    num_repairs: int,
) -> float:
    """Realistic resale price formula (used to generate training labels)."""
    # Base depreciation: ~1.5% per month for first 12 months, 0.8% after
    if age_months <= 12:
        depreciation = age_months * 0.015
    else:
        depreciation = 12 * 0.015 + (age_months - 12) * 0.008

    depreciation = min(depreciation, 0.75)  # Cap at 75% depreciation

    # Condition adjustment (score 50 = neutral)
    condition_adj = (condition_score - 50) / 100 * 0.20

    # Repair penalty: each repair reduces price by 3%
    repair_penalty = num_repairs * 0.03

    # Box bonus
    box_bonus = 0.02 if has_box else 0.0

    multiplier = (1 - depreciation) + condition_adj - repair_penalty + box_bonus
    multiplier = max(0.10, min(1.0, multiplier))  # Clamp 10%–100%

    price = original_price * multiplier
    # Add ±5% random noise for realism
    noise = random.uniform(-0.05, 0.05)
    return max(500.0, round(price * (1 + noise), 2))


def generate_tabular_dataset(num_samples: int = 5000, output_path: Path = None):
    """
    Generate a synthetic training dataset for the price prediction model.
    Use this if you don't have a real CSV.
    Replace with real Kaggle data for better accuracy.
    """
    if output_path is None:
        output_path = DATASET_DIR / "price_training_data.csv"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    rows = []
    for i in range(num_samples):
        # Random category
        category = random.choice(["phone", "laptop"])
        brands = BRANDS_PHONES if category == "phone" else BRANDS_LAPTOPS
        price_ranges = PHONE_PRICES if category == "phone" else LAPTOP_PRICES

        brand = random.choice(brands)
        min_p, max_p = price_ranges[brand]
        original_price = round(random.uniform(min_p, max_p), -2)  # Round to nearest 100

        condition = random.choice(CLASSES)
        cond_min, cond_max = CONDITION_SCORE_RANGES[condition]
        condition_score = random.randint(cond_min, cond_max)

        age_months = random.randint(1, 60)  # 1 month to 5 years old
        ram_gb = random.choice([4, 6, 8, 12, 16, 32]) if category == "phone" else random.choice([4, 8, 16, 32, 64])
        storage_gb = random.choice([64, 128, 256, 512]) if category == "phone" else random.choice([256, 512, 1024])
        has_box = random.choice([True, False])
        num_repairs = random.choices([0, 1, 2, 3], weights=[70, 20, 7, 3])[0]

        resale_price = _compute_resale_price(
            original_price, age_months, condition_score, has_box, num_repairs
        )

        rows.append({
            "brand": brand,
            "category": category,
            "age_months": age_months,
            "original_price": original_price,
            "condition_score": condition_score,
            "condition_label": condition,
            "ram_gb": ram_gb,
            "storage_gb": storage_gb,
            "has_original_box": int(has_box),
            "num_repairs": num_repairs,
            "resale_price": resale_price,
        })

    df = pd.DataFrame(rows)
    df.to_csv(output_path, index=False)
    print(f"\n✅ Generated {num_samples} training samples → {output_path}")
    print(df.describe())
    return df


def load_kaggle_price_data(csv_path: Path, output_path: Path = None) -> pd.DataFrame:
    """
    Parse the Kaggle 'used-handheld-device-data' CSV into our format.
    Download from: https://www.kaggle.com/datasets/ahsan81/used-handheld-device-data
    """
    if output_path is None:
        output_path = DATASET_DIR / "price_training_data.csv"

    df = pd.read_csv(csv_path)
    print(f"Loaded Kaggle CSV: {df.shape[0]} rows, columns: {list(df.columns)}")

    # Map Kaggle columns to our feature columns
    # Adjust column names based on actual Kaggle dataset
    column_mapping = {
        "brand_name": "brand",
        "os": "category",
        "years_since_launch": "age_months",
        "normalized_used_price": "resale_price",
        "normalized_new_price": "original_price",
        "ram": "ram_gb",
        "storage": "storage_gb",
    }

    df = df.rename(columns={k: v for k, v in column_mapping.items() if k in df.columns})

    # Convert years to months if needed
    if "age_months" in df.columns and df["age_months"].max() < 20:
        df["age_months"] = (df["age_months"] * 12).astype(int)

    # Add missing columns with defaults
    for col, default in [("condition_score", 60), ("has_original_box", 0), ("num_repairs", 0)]:
        if col not in df.columns:
            df[col] = default

    # Determine category from OS or device type
    if "category" in df.columns:
        df["category"] = df["category"].str.lower().apply(
            lambda x: "phone" if any(k in str(x) for k in ["android", "ios", "phone"]) else "laptop"
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"✅ Processed Kaggle data → {output_path}")
    return df


# ─── Entry Point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("SmartGoal Resale Price Estimation — Dataset Preparation")
    print("=" * 60)

    # Step 1: Organize images (only if you have images in data/raw_images/)
    if RAW_DIR.exists() and any(RAW_DIR.iterdir()):
        organize_images(RAW_DIR)
    else:
        print(f"\n⚠️  No images found in {RAW_DIR}")
        print("   Add images in subfolders: poor/, fair/, good/, excellent/, new/")
        print("   Then re-run this script.\n")

    # Step 2: Generate tabular price dataset
    kaggle_csv = DATASET_DIR / "used_device_data.csv"  # Put your Kaggle CSV here
    if kaggle_csv.exists():
        print(f"\n📊 Found Kaggle CSV: {kaggle_csv}")
        load_kaggle_price_data(kaggle_csv)
    else:
        print("\n📊 No Kaggle CSV found — generating synthetic training data...")
        print("   (Replace with real data for better accuracy)")
        generate_tabular_dataset(num_samples=5000)

    print("\n✅ Dataset preparation complete!")
    print("   Next: Run  python src/training/train_condition_model.py")
    print("         Then: python src/training/train_price_model.py")
