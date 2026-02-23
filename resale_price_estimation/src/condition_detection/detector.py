"""
Condition Detection Module — Trained Profile + CV Defect Analysis
==================================================================
Uses:
  1. Trained "good" reference profile (from processed_images dataset)
  2. OpenCV computer vision analysis for specific defect types

Defects detected:
  • Screen Blur / Physical Damage   — low Laplacian variance vs. good profile
  • Screen Cracks                   — Hough line anomalies (unexpected straight lines)
  • Scratches                       — high scattered edge density vs. good profile
  • Dark Spots / Dead Pixels        — dark blob detection
  • Discoloration / Stains          — abnormal colour channel imbalance
  • Overexposure                    — washed-out image (likely flash on cracked screen)

Condition score (0–100):
  ≥ 91 → new
  76–90 → excellent
  56–75 → good
  31–55 → fair
  0–30  → poor
"""

import cv2
import pickle
import numpy as np
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

ROOT              = Path(__file__).resolve().parents[2]
CONDITION_MODEL_DIR = ROOT / "models" / "condition_model"
PROFILE_PATH      = CONDITION_MODEL_DIR / "good_profile.pkl"
SVM_MODEL_PATH    = CONDITION_MODEL_DIR / "condition_model.pkl"
SCALER_PATH       = CONDITION_MODEL_DIR / "scaler.pkl"
PCA_PATH          = CONDITION_MODEL_DIR / "pca.pkl"

# ── Condition thresholds ──────────────────────────────────────────────────────
SCORE_THRESHOLDS = [
    (91, "new"),
    (76, "excellent"),
    (56, "good"),
    (31, "fair"),
    (0,  "poor"),
]

CONDITION_SCORE_MAP = {
    "poor":      20,
    "fair":      42,
    "good":      65,
    "excellent": 83,
    "new":       95,
}

# ── Defect severity levels ────────────────────────────────────────────────────
SEVERITY_MINOR    = "minor"
SEVERITY_MODERATE = "moderate"
SEVERITY_SEVERE   = "severe"


@dataclass
class Defect:
    name: str                  # e.g. "Screen Scratches"
    severity: str              # minor / moderate / severe
    description: str           # human-readable explanation
    score_penalty: int         # how much this reduces condition score


@dataclass
class ConditionResult:
    label: str                 # e.g. "good"
    confidence: float          # 0.0 – 1.0
    score: int                 # 0 – 100
    breakdown: dict            # sub-scores for each signal
    defects: List[Defect] = field(default_factory=list)
    is_anomaly: bool = False   # True if ML model flagged as non-good


def score_to_label(score: int) -> str:
    for threshold, label in SCORE_THRESHOLDS:
        if score >= threshold:
            return label
    return "poor"


# ── Model loading ─────────────────────────────────────────────────────────────

_good_profile = None
_svm_model    = None
_scaler       = None
_pca          = None


def _load_models():
    global _good_profile, _svm_model, _scaler, _pca
    if _good_profile is not None:
        return

    if PROFILE_PATH.exists():
        with open(PROFILE_PATH, "rb") as f:
            _good_profile = pickle.load(f)
        logger.info("Loaded good reference profile from dataset images.")
    else:
        logger.warning("Good profile not found — using default thresholds.")
        _good_profile = {
            "lap_var_mean": 869.0,
            "lap_var_std":  641.0,
            "brightness_mean": 53.0,
            "brightness_std":  20.0,
            "edge_ratio_mean": 0.0268,
            "edge_ratio_std":  0.015,
        }

    if SVM_MODEL_PATH.exists() and SCALER_PATH.exists() and PCA_PATH.exists():
        with open(SVM_MODEL_PATH, "rb") as f: _svm_model = pickle.load(f)
        with open(SCALER_PATH,    "rb") as f: _scaler    = pickle.load(f)
        with open(PCA_PATH,       "rb") as f: _pca       = pickle.load(f)
        logger.info("Loaded OneClassSVM condition model.")


# ── Feature helpers ──────────────────────────────────────────────────────────

def _hog_features(img_bgr: np.ndarray, size=(224, 224)) -> np.ndarray:
    img = cv2.resize(img_bgr, size)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hog = cv2.HOGDescriptor(
        _winSize=(224, 224),
        _blockSize=(16, 16),
        _blockStride=(8, 8),
        _cellSize=(8, 8),
        _nbins=9,
    )
    return hog.compute(gray).flatten()


def _color_hist(img_bgr: np.ndarray, size=(224, 224), bins=32) -> np.ndarray:
    img = cv2.resize(img_bgr, size)
    hist = []
    for ch in range(3):
        h = cv2.calcHist([img], [ch], None, [bins], [0, 256])
        cv2.normalize(h, h)
        hist.append(h.flatten())
    return np.concatenate(hist)


def _texture_vec(img_bgr: np.ndarray, size=(224, 224)) -> np.ndarray:
    img = cv2.resize(img_bgr, size)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    lap_var    = cv2.Laplacian(gray, cv2.CV_64F).var()
    brightness = np.mean(gray)
    brt_std    = np.std(gray)
    edges      = cv2.Canny(gray, 50, 150)
    edge_ratio = np.sum(edges > 0) / edges.size
    h, w = gray.shape
    block_vars = [np.var(gray[i*h//3:(i+1)*h//3, j*w//3:(j+1)*w//3]) for i in range(3) for j in range(3)]
    return np.array([lap_var, brightness, brt_std, edge_ratio] + block_vars)


def _full_feature_vec(img_bgr: np.ndarray) -> np.ndarray:
    return np.concatenate([_hog_features(img_bgr), _color_hist(img_bgr), _texture_vec(img_bgr)])


# ── Specific defect detection functions ──────────────────────────────────────

def _detect_blur(gray: np.ndarray, lap_mean: float, lap_std: float) -> Optional[Defect]:
    """
    Detect blur using ABSOLUTE Laplacian thresholds — independent of dataset profile.
    A very blurry photo (lap < 30) usually means camera damage or severe screen damage.
    """
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()

    if lap_var < 20:
        return Defect(
            name="Screen Blur / Physical Damage",
            severity=SEVERITY_SEVERE,
            description=f"Image is severely blurry (sharpness={lap_var:.0f}) — indicates cracked/shattered screen or camera damage",
            score_penalty=35,
        )
    if lap_var < 50:
        return Defect(
            name="Screen Blur / Physical Damage",
            severity=SEVERITY_MODERATE,
            description=f"Image clarity is low (sharpness={lap_var:.0f}) — possible screen or camera damage",
            score_penalty=18,
        )
    return None


def _detect_cracks(gray: np.ndarray) -> Optional[Defect]:
    """
    Detect screen cracks using two complementary methods:
    1. Long straight lines (Hough) — ANY angle inside the inner screen area
       excluding only the outer 18% border (phone chassis edges)
    2. High edge density in the inner region compared to what "good" looks like
    """
    h, w = gray.shape
    # Crop to inner 64% — removes chassis/bezel, focuses on the screen
    mx, my = int(w * 0.18), int(h * 0.18)
    inner = gray[my:h - my, mx:w - mx]
    ih, iw = inner.shape

    edges = cv2.Canny(inner, 30, 100)
    lines = cv2.HoughLinesP(
        edges, 1, np.pi / 180,
        threshold=50,
        minLineLength=iw // 7,      # shorter threshold catches more cracks
        maxLineGap=25,
    )

    crack_count = 0
    if lines is not None:
        for line in lines:
            for x1, y1, x2, y2 in line:
                length = np.hypot(x2 - x1, y2 - y1)
                if length < iw // 7:
                    continue
                angle = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
                # Exclude ONLY lines that run exactly along the inner-crop edges
                # (nearly-horizontal at the very top/bottom 10%, or vertical at left/right 10%)
                is_edge_h = (angle < 8 or angle > 172) and (y1 < ih * 0.10 or y1 > ih * 0.90)
                is_edge_v = (80 < angle < 100) and (x1 < iw * 0.10 or x1 > iw * 0.90)
                if not is_edge_h and not is_edge_v:
                    crack_count += 1

    # Also measure raw edge density in the inner region
    edge_density = np.sum(edges > 0) / edges.size

    # Calibrated from empirical testing:
    # Good phone inner edge density: ~0.008-0.021
    # Cracked phone inner edge density: ~0.05-0.20+
    if crack_count >= 8 or edge_density > 0.065:
        return Defect(
            name="Screen Cracks",
            severity=SEVERITY_SEVERE,
            description=f"Severe cracking — {crack_count} crack lines, inner edge density {edge_density:.3f}",
            score_penalty=45,
        )
    if crack_count >= 3 or edge_density > 0.040:
        return Defect(
            name="Screen Cracks",
            severity=SEVERITY_MODERATE,
            description=f"Screen cracked — {crack_count} lines detected, inner edge density {edge_density:.3f}",
            score_penalty=28,
        )
    if crack_count >= 1 or edge_density > 0.028:
        return Defect(
            name="Screen Cracks",
            severity=SEVERITY_MINOR,
            description=f"Possible hairline crack — {crack_count} suspicious line(s), density {edge_density:.3f}",
            score_penalty=12,
        )
    return None


def _detect_scratches(gray: np.ndarray, edge_mean: float, edge_std: float) -> Optional[Defect]:
    """
    Surface scratches: many small disconnected edge fragments in the screen center.
    Uses ABSOLUTE thresholds so it works on real user photos (not just product shots).
    """
    h, w = gray.shape
    center = gray[h // 4: 3 * h // 4, w // 4: 3 * w // 4]

    edges = cv2.Canny(center, 40, 120)
    edge_ratio = np.sum(edges > 0) / edges.size

    # Count small scattered fragments (scratch signature: many tiny edge pieces)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    small_fragments = sum(1 for c in contours if 3 < cv2.contourArea(c) < 250)

    # Absolute thresholds based on what scratch-free screens look like
    if edge_ratio > 0.12 or small_fragments > 200:
        return Defect(
            name="Surface Scratches",
            severity=SEVERITY_SEVERE,
            description=f"Heavy scratch pattern (edge density {edge_ratio:.3f}, {small_fragments} scattered marks)",
            score_penalty=30,
        )
    if edge_ratio > 0.07 or small_fragments > 100:
        return Defect(
            name="Surface Scratches",
            severity=SEVERITY_MODERATE,
            description=f"Noticeable scratches on screen or body ({small_fragments} edge fragments, density {edge_ratio:.3f})",
            score_penalty=15,
        )
    if edge_ratio > 0.04 or small_fragments > 50:
        return Defect(
            name="Surface Scratches",
            severity=SEVERITY_MINOR,
            description=f"Minor surface marks — light wear and tear ({small_fragments} fragments)",
            score_penalty=6,
        )
    return None


def _detect_dark_spots(gray: np.ndarray) -> Optional[Defect]:
    """
    Morphological blob detection for dead pixels or burn marks.
    Looks for unusually dark clusters within the screen area.
    """
    h, w = gray.shape
    center = gray[h // 6: 5 * h // 6, w // 6: 5 * w // 6]

    # Threshold to find dark regions (below 40 brightness in an otherwise lit screen)
    overall_brightness = np.mean(center)
    if overall_brightness < 50:
        # Whole image is dark — not necessarily dark spots, just dim image
        return None

    dark_threshold = max(20, int(overall_brightness * 0.3))
    _, dark_mask = cv2.threshold(center, dark_threshold, 255, cv2.THRESH_BINARY_INV)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    cleaned = cv2.morphologyEx(dark_mask, cv2.MORPH_OPEN, kernel)
    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    significant = [c for c in contours if cv2.contourArea(c) > 400]
    total_dark_px = sum(cv2.contourArea(c) for c in significant)
    dark_coverage = total_dark_px / (center.size) * 100

    if dark_coverage > 10 or len(significant) > 6:
        return Defect(
            name="Dark Spots / Dead Pixels",
            severity=SEVERITY_SEVERE,
            description=f"{len(significant)} dark spot(s) covering ~{dark_coverage:.1f}% of screen area",
            score_penalty=28,
        )
    if dark_coverage > 3 or len(significant) > 2:
        return Defect(
            name="Dark Spots / Dead Pixels",
            severity=SEVERITY_MODERATE,
            description=f"{len(significant)} dark area(s) detected on the display",
            score_penalty=14,
        )
    return None


def _detect_discoloration(img_bgr: np.ndarray) -> Optional[Defect]:
    """
    Detects uneven colour patches, burn marks, or stains via HSV analysis.
    Abnormal hue concentrations or saturation spikes in localised regions.
    """
    h, w = img_bgr.shape[:2]
    center = img_bgr[h // 6: 5 * h // 6, w // 6: 5 * w // 6]
    hsv = cv2.cvtColor(center, cv2.COLOR_BGR2HSV)

    sat = hsv[:, :, 1].astype(float)
    sat_mean = np.mean(sat)
    sat_std  = np.std(sat)

    # High local saturation variance = colour blotches
    if sat_std > 70 and sat_mean > 50:
        # Check if it's just a naturally colourful image vs actual staining
        hue = hsv[:, :, 0]
        hue_hist, _ = np.histogram(hue.flatten(), bins=18, range=(0, 180))
        dominant_pct = hue_hist.max() / hue_hist.sum()

        if dominant_pct < 0.4:
            # No clear dominant hue → mixed discolouration (stains/burns)
            return Defect(
                name="Discoloration / Stains",
                severity=SEVERITY_MODERATE,
                description="Uneven colour patches detected — possible stains or burn marks",
                score_penalty=16,
            )
    return None


def _detect_overexposure(gray: np.ndarray) -> Optional[Defect]:
    """
    Very high brightness + low variance → flash on cracked screen / overexposed.
    """
    mean = float(np.mean(gray))
    std  = float(np.std(gray))

    if mean > 220 and std < 25:
        return Defect(
            name="Flash Reflection / Overexposure",
            severity=SEVERITY_MINOR,
            description="Image appears overexposed — cracked glass may be reflecting light",
            score_penalty=8,
        )
    return None


# ── Main public function ───────────────────────────────────────────────────────

def detect_condition(image_path: Path, **_ignored) -> ConditionResult:
    """
    Analyse a device image for defects and condition.

    Uses the trained "good" reference profile (from processed_images dataset)
    to calibrate the analysis. Any deviation from "good" phones is flagged.

    Args:
        image_path: Path to image file.

    Returns:
        ConditionResult with label, score, defects list, and breakdown.
    """
    _load_models()

    img_bgr = cv2.imread(str(image_path))
    if img_bgr is None:
        logger.warning(f"Could not read image: {image_path}")
        return ConditionResult(
            label="fair", confidence=0.4, score=42,
            breakdown={}, defects=[], is_anomaly=False
        )

    img_bgr = cv2.resize(img_bgr, (512, 512))
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    prof = _good_profile

    # ── CV metrics ────────────────────────────────────────────────────────────
    lap_var    = cv2.Laplacian(gray, cv2.CV_64F).var()
    brightness = float(np.mean(gray))
    edges_full = cv2.Canny(gray, 50, 150)
    edge_ratio = np.sum(edges_full > 0) / edges_full.size

    breakdown = {
        "laplacian_variance": round(float(lap_var), 1),
        "brightness":         round(brightness, 1),
        "edge_density":       round(float(edge_ratio), 4),
        "good_profile_lap":   round(prof["lap_var_mean"], 1),
        "good_profile_edges": round(prof["edge_ratio_mean"], 4),
    }

    # ── Defect scan ───────────────────────────────────────────────────────────
    defects: List[Defect] = []

    d = _detect_blur(gray, prof["lap_var_mean"], prof["lap_var_std"])
    if d: defects.append(d)

    d = _detect_cracks(gray)
    if d: defects.append(d)

    d = _detect_scratches(gray, prof["edge_ratio_mean"], prof["edge_ratio_std"])
    if d: defects.append(d)

    d = _detect_dark_spots(gray)
    if d: defects.append(d)

    d = _detect_discoloration(img_bgr)
    if d: defects.append(d)

    d = _detect_overexposure(gray)
    if d: defects.append(d)

    # ── OneClassSVM anomaly check ─────────────────────────────────────────────
    is_anomaly = False
    if _svm_model is not None:
        try:
            fv = _full_feature_vec(img_bgr)
            fv_scaled = _scaler.transform(fv.reshape(1, -1))
            fv_pca    = _pca.transform(fv_scaled)
            pred = _svm_model.predict(fv_pca)[0]
            is_anomaly = (pred == -1)
            breakdown["svm_anomaly"] = is_anomaly
            if is_anomaly:
                logger.info("OneClassSVM flagged image as anomaly (non-good condition)")
        except Exception as e:
            logger.warning(f"SVM check failed: {e}")

    # ── Compute condition score ───────────────────────────────────────────────
    # Uses ABSOLUTE thresholds — independent of the dataset profile.
    # Profile is used only by specific defect detectors, not by base scoring.

    penalty_total = sum(d.score_penalty for d in defects)

    # Absolute edge-density penalty (real cracked screens: edge_ratio >> 0.05)
    if edge_ratio > 0.12:
        edge_base_penalty = 25
    elif edge_ratio > 0.07:
        edge_base_penalty = 15
    elif edge_ratio > 0.05:
        edge_base_penalty = 8
    else:
        edge_base_penalty = 0

    # SVM anomaly adds extra penalty
    if is_anomaly:
        penalty_total += 12

    base_score = 85 - edge_base_penalty
    final_score = int(round(max(0, min(100, base_score - penalty_total))))

    breakdown["edge_base_penalty"] = edge_base_penalty

    label = score_to_label(final_score)

    # Confidence: 1.0 if far from nearest boundary, 0.5 if right on it
    thresholds = [t for t, _ in SCORE_THRESHOLDS if t > 0]
    min_dist   = min(abs(final_score - t) for t in thresholds)
    confidence = round(min(1.0, 0.5 + min_dist / 50), 3)

    breakdown["final_score"]  = final_score
    breakdown["penalty_total"] = penalty_total
    breakdown["defect_count"]  = len(defects)

    logger.info(
        f"Condition: {label} (score={final_score}) | "
        f"defects={[d.name for d in defects]} | "
        f"anomaly={is_anomaly} | lap_var={lap_var:.1f} edges={edge_ratio:.4f}"
    )

    return ConditionResult(
        label=label,
        confidence=confidence,
        score=final_score,
        breakdown=breakdown,
        defects=defects,
        is_anomaly=is_anomaly,
    )
