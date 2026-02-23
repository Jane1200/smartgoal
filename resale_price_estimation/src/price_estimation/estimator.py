"""
Price Estimator — loads the trained GBR model and runs inference.
No rule-based fallback: if the model isn't trained yet, it auto-trains.
"""

import pickle
import logging
import numpy as np
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR  = ROOT / "models" / "price_model"
MODEL_PATH = MODEL_DIR / "price_model.pkl"
META_PATH  = MODEL_DIR / "metadata.pkl"

# ── Encodings (must match train_price_model.py) ───────────────────────────────
BRANDS = [
    "Apple", "Samsung", "OnePlus", "Xiaomi", "Oppo", "Vivo",
    "Dell", "HP", "Lenovo", "Asus", "Acer", "Other",
]
CATEGORIES = ["phone", "laptop"]
CONDITION_LABELS = ["poor", "fair", "good", "excellent", "new"]


def encode_brand(brand: str) -> int:
    known = {b: i for i, b in enumerate(BRANDS)}
    return known.get(brand.strip().title(), len(BRANDS) - 1)


def encode_category(cat: str) -> int:
    return 1 if cat.lower().strip() == "laptop" else 0


def encode_condition_label(label: str) -> int:
    label = label.lower().strip()
    return CONDITION_LABELS.index(label) if label in CONDITION_LABELS else 2


def _build_feature_vector(
    brand: str,
    category: str,
    age_months: float,
    original_price: float,
    condition_score: float,
    condition_label: str = "good",
    ram_gb: int = 0,
    storage_gb: int = 128,
    has_original_box: bool = False,
    num_repairs: int = 0,
) -> np.ndarray:
    age_years = age_months / 12.0

    features = [
        encode_brand(brand),                        # brand_enc
        encode_category(category),                  # category_enc
        float(age_months),                          # age_months
        age_years,                                  # age_years
        float(original_price),                      # original_price
        float(condition_score),                     # condition_score
        encode_condition_label(condition_label),    # condition_label_enc
        float(ram_gb),                              # ram_gb
        float(storage_gb),                          # storage_gb
        int(has_original_box),                      # has_original_box
        int(num_repairs),                           # num_repairs
        original_price / (age_years + 0.1),        # depreciation_rate
        condition_score * (1 / (age_years + 0.5)), # condition_age_interact
        original_price / (float(storage_gb) + 1),  # price_per_gb_storage
        int(category.lower() == "laptop"),          # is_laptop
    ]
    return np.array(features, dtype=np.float64).reshape(1, -1)


@dataclass
class PriceEstimate:
    amount: int        # central estimate in INR
    min_price: int     # lower bound (10th percentile)
    max_price: int     # upper bound (90th percentile)
    condition_label: str
    condition_score: int
    breakdown: dict


def load_model(model_path: Optional[Path] = None):
    """Load the trained pickle model. Auto-trains if not found."""
    path = model_path or MODEL_PATH
    if not Path(path).exists():
        logger.warning(f"Price model not found at {path}. Auto-training now...")
        _auto_train()
    with open(path, "rb") as f:
        return pickle.load(f)


def _auto_train():
    """Trigger training script inline if model doesn't exist."""
    import sys
    sys.path.insert(0, str(ROOT))
    from src.training.train_price_model import main as train_main
    train_main()


def estimate_price(
    brand: str,
    category: str,
    age_months: float,
    original_price: float,
    condition_score: float,
    condition_label: str = "good",
    model=None,
    model_path: Optional[Path] = None,
    ram_gb: int = 0,
    storage_gb: int = 128,
    has_original_box: bool = False,
    num_repairs: int = 0,
) -> PriceEstimate:
    """
    Run the trained ML model to estimate resale price.
    Raises RuntimeError if model cannot be loaded or trained.
    """
    if model is None:
        model = load_model(model_path)

    X = _build_feature_vector(
        brand=brand,
        category=category,
        age_months=age_months,
        original_price=original_price,
        condition_score=condition_score,
        condition_label=condition_label,
        ram_gb=ram_gb,
        storage_gb=storage_gb,
        has_original_box=has_original_box,
        num_repairs=num_repairs,
    )

    predicted = float(model.predict(X)[0])
    predicted = max(500.0, predicted)  # floor at ₹500

    # Price range: ±12% around central estimate
    margin = predicted * 0.12
    min_price = int(max(100, round(predicted - margin)))
    max_price = int(round(predicted + margin))
    amount    = int(round(predicted))

    # Infer condition label from score if not provided
    if not condition_label or condition_label == "unknown":
        from src.condition_detection.detector import score_to_label
        condition_label = score_to_label(int(condition_score))

    return PriceEstimate(
        amount=amount,
        min_price=min_price,
        max_price=max_price,
        condition_label=condition_label,
        condition_score=int(condition_score),
        breakdown={
            "brand": brand,
            "category": category,
            "age_months": age_months,
            "original_price": original_price,
            "condition_score": condition_score,
            "condition_label": condition_label,
        },
    )
