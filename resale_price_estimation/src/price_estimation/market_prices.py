"""
Market Price Reference Table
==============================
Loads the training CSV and builds a median/percentile price table
grouped by (category, condition_label).

Used when the user does NOT supply an original_price — the system
estimates price purely from the scanned condition and device category.
"""

import csv
import statistics
import logging
from pathlib import Path
from collections import defaultdict

logger = logging.getLogger(__name__)

ROOT     = Path(__file__).resolve().parents[2]
CSV_PATH = ROOT / "data" / "datasets" / "price_training_data.csv"

# ── Pre-built lookup tables ───────────────────────────────────────────────────

# Fallback values if CSV is not available (INR)
_FALLBACK = {
    ("phone", "new"):       (24000, 18000, 35000),
    ("phone", "excellent"): (20000, 14000, 30000),
    ("phone", "good"):      (16000, 10000, 24000),
    ("phone", "fair"):      (12000,  7000, 18000),
    ("phone", "poor"):      ( 8000,  4000, 13000),
    ("laptop", "new"):       (62000, 45000, 90000),
    ("laptop", "excellent"): (52000, 35000, 75000),
    ("laptop", "good"):      (44000, 28000, 65000),
    ("laptop", "fair"):      (35000, 20000, 55000),
    ("laptop", "poor"):      (25000, 12000, 40000),
}

_price_table: dict = {}   # (category, condition) → (median, p25, p75)


def _load():
    global _price_table
    if _price_table:
        return

    if not CSV_PATH.exists():
        logger.warning(f"Price CSV not found at {CSV_PATH} — using fallback values.")
        _price_table = _FALLBACK
        return

    buckets: dict = defaultdict(list)
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cat  = row.get("category", "").strip().lower()
            cond = row.get("condition_label", "").strip().lower()
            try:
                price = float(row.get("resale_price", 0))
                if price > 0:
                    buckets[(cat, cond)].append(price)
            except (ValueError, TypeError):
                continue

    for key, vals in buckets.items():
        if len(vals) < 3:
            continue
        vals.sort()
        n = len(vals)
        median = statistics.median(vals)
        p25 = vals[int(n * 0.25)]
        p75 = vals[int(n * 0.75)]
        _price_table[key] = (median, p25, p75)

    # Fill missing conditions using fallback
    for key, val in _FALLBACK.items():
        if key not in _price_table:
            _price_table[key] = val

    logger.info(f"Market price table built: {len(_price_table)} (category, condition) entries")


def get_market_price(category: str, condition_label: str) -> dict:
    """
    Return median, min (p25) and max (p75) resale price
    for a given category + condition from the training dataset.

    Returns:
        { amount, min_price, max_price, currency }
    """
    _load()
    cat  = category.strip().lower()
    cond = condition_label.strip().lower()
    key  = (cat, cond)

    if key not in _price_table:
        # Fall back to closest condition
        for alt in ["good", "fair", "excellent", "new", "poor"]:
            if (cat, alt) in _price_table:
                key = (cat, alt)
                break
        else:
            return {
                "amount":    15000,
                "min_price": 8000,
                "max_price": 25000,
                "currency":  "INR",
                "source":    "fallback_default",
            }

    median, p25, p75 = _price_table[key]
    return {
        "amount":    round(median),
        "min_price": round(p25),
        "max_price": round(p75),
        "currency":  "INR",
        "source":    "dataset_median",
    }
