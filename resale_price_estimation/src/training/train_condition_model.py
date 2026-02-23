"""
Condition Model Training — OneClassSVM Anomaly Detector
=========================================================
Trains on 60 "good phone" images using HOG (Histogram of Oriented Gradients)
as features. Any image that deviates from the "good" profile is flagged as
having defects.

Strategy: One-Class Classification (anomaly detection)
  - train on GOOD images only
  - at inference: high anomaly score → defects found

Run:
    cd resale_price_estimation
    python src/training/train_condition_model.py
"""

import os
import pickle
import logging
import numpy as np
import cv2
from pathlib import Path
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

ROOT      = Path(__file__).resolve().parents[2]
DATA_DIR  = ROOT / "data" / "processed_images"
MODEL_DIR = ROOT / "models" / "condition_model"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH  = MODEL_DIR / "condition_model.pkl"
SCALER_PATH = MODEL_DIR / "scaler.pkl"
PCA_PATH    = MODEL_DIR / "pca.pkl"
PROFILE_PATH = MODEL_DIR / "good_profile.pkl"   # mean / std of "good" images

IMG_SIZE = (224, 224)


# ── Feature extraction ────────────────────────────────────────────────────────

def extract_hog(img_bgr: np.ndarray) -> np.ndarray:
    """Compute HOG descriptor for the image."""
    img = cv2.resize(img_bgr, IMG_SIZE)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hog = cv2.HOGDescriptor(
        _winSize=(224, 224),
        _blockSize=(16, 16),
        _blockStride=(8, 8),
        _cellSize=(8, 8),
        _nbins=9,
    )
    return hog.compute(gray).flatten()


def extract_color_hist(img_bgr: np.ndarray, bins: int = 32) -> np.ndarray:
    """Concatenated colour histogram (B, G, R channels)."""
    img = cv2.resize(img_bgr, IMG_SIZE)
    hist = []
    for ch in range(3):
        h = cv2.calcHist([img], [ch], None, [bins], [0, 256])
        cv2.normalize(h, h)
        hist.append(h.flatten())
    return np.concatenate(hist)


def extract_texture(img_bgr: np.ndarray) -> np.ndarray:
    """LBP-like texture: Laplacian variance, edge density, brightness std."""
    img = cv2.resize(img_bgr, IMG_SIZE)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    lap_var   = cv2.Laplacian(gray, cv2.CV_64F).var()
    brightness = np.mean(gray)
    brt_std    = np.std(gray)
    edges      = cv2.Canny(gray, 50, 150)
    edge_ratio = np.sum(edges > 0) / edges.size

    # Local block variance (3x3 grid) — captures uneven damage
    h, w = gray.shape
    block_vars = []
    for i in range(3):
        for j in range(3):
            block = gray[i*h//3:(i+1)*h//3, j*w//3:(j+1)*w//3]
            block_vars.append(np.var(block))

    return np.array([lap_var, brightness, brt_std, edge_ratio] + block_vars)


def extract_features(img_bgr: np.ndarray) -> np.ndarray:
    """Full feature vector: HOG + colour histogram + texture stats."""
    hog  = extract_hog(img_bgr)
    hist = extract_color_hist(img_bgr)
    tex  = extract_texture(img_bgr)
    return np.concatenate([hog, hist, tex])


# ── Data loading ──────────────────────────────────────────────────────────────

def load_good_images() -> list:
    """Collect all good phone images from train/val/test."""
    images = []
    for split in ["train", "val", "test"]:
        # Walk the directory tree — handles nested folders like 'good phone/'
        root_path = DATA_DIR / split / "good"
        if not root_path.exists():
            continue
        for dirpath, _, filenames in os.walk(root_path):
            for fn in sorted(filenames):
                if fn.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp")):
                    full_path = os.path.join(dirpath, fn)
                    img = cv2.imread(full_path)
                    if img is not None:
                        images.append(img)
                        logger.info(f"  Loaded: {full_path}  shape={img.shape}")

    logger.info(f"Total good images loaded: {len(images)}")
    return images


# ── Training ──────────────────────────────────────────────────────────────────

def train():
    logger.info("=" * 60)
    logger.info("Training OneClassSVM on 'good' device images")
    logger.info("=" * 60)

    images = load_good_images()
    if len(images) == 0:
        raise FileNotFoundError(f"No images found under {DATA_DIR}")

    logger.info(f"\nExtracting features from {len(images)} images...")
    X = np.array([extract_features(img) for img in images])
    logger.info(f"Raw feature matrix: {X.shape}")

    # Also build the simple profile (mean/std of each texture metric) for
    # fast defect scoring in detector.py
    texture_features = np.array([extract_texture(img) for img in images])
    good_profile = {
        "mean": texture_features.mean(axis=0),
        "std":  texture_features.std(axis=0) + 1e-6,
        "lap_var_mean":   float(texture_features[:, 0].mean()),
        "lap_var_std":    float(texture_features[:, 0].std()),
        "brightness_mean": float(texture_features[:, 1].mean()),
        "brightness_std":  float(texture_features[:, 1].std()),
        "edge_ratio_mean": float(texture_features[:, 3].mean()),
        "edge_ratio_std":  float(texture_features[:, 3].std()),
    }
    logger.info(f"Good profile — lap_var: {good_profile['lap_var_mean']:.1f}±{good_profile['lap_var_std']:.1f}  "
                f"brightness: {good_profile['brightness_mean']:.1f}  "
                f"edges: {good_profile['edge_ratio_mean']:.4f}")

    # Standardise
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # PCA to reduce dimensionality (HOG is very high-dim)
    n_components = min(50, X_scaled.shape[0] - 1, X_scaled.shape[1])
    pca = PCA(n_components=n_components, random_state=42)
    X_pca = pca.fit_transform(X_scaled)
    logger.info(f"After PCA: {X_pca.shape}  (variance explained: {pca.explained_variance_ratio_.sum():.3f})")

    # Deduplicate feature rows to avoid over-fitting on duplicated images
    # (train/val/test contain the same 20 images → 60 rows but ~20 unique)
    X_unique = np.unique(X_pca, axis=0)
    logger.info(f"Unique feature rows: {X_unique.shape[0]}")

    # OneClassSVM — nu=0.1 means at most 10% of training is allowed as outliers.
    # Using a moderate nu so the boundary isn't excessively tight for 20 images.
    model = OneClassSVM(kernel="rbf", nu=0.1, gamma="scale")
    model.fit(X_unique)
    logger.info("OneClassSVM trained.")

    # Self-test on the unique training images (should mostly predict +1 = good)
    preds = model.predict(X_unique)
    good_pct = (preds == 1).mean() * 100
    logger.info(f"Self-test: {good_pct:.1f}% of unique training images classified as good")

    # Save everything
    with open(MODEL_PATH, "wb") as f:   pickle.dump(model, f)
    with open(SCALER_PATH, "wb") as f:  pickle.dump(scaler, f)
    with open(PCA_PATH, "wb") as f:     pickle.dump(pca, f)
    with open(PROFILE_PATH, "wb") as f: pickle.dump(good_profile, f)

    logger.info(f"\n✅ Model    → {MODEL_PATH}")
    logger.info(f"✅ Scaler   → {SCALER_PATH}")
    logger.info(f"✅ PCA      → {PCA_PATH}")
    logger.info(f"✅ Profile  → {PROFILE_PATH}")


if __name__ == "__main__":
    train()
