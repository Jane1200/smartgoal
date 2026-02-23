"""
SmartGoal Resale Price Estimation API
======================================
Condition detection: OneClassSVM trained on good phone images + CV defect analysis
Price estimation:    GradientBoostingRegressor trained on 5000-row dataset
                     OR median market price when no original_price given

Endpoints:
    POST /scan-defects  — image only → defects list + price estimate (primary)
    POST /estimate      — image + metadata → price estimate
    POST /condition     — image only → condition label + score
    GET  /health        — health check
"""

import os
import logging
import tempfile
import traceback
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.condition_detection.detector import detect_condition
from src.price_estimation.estimator import estimate_price, load_model as load_price_model
from src.price_estimation.market_prices import get_market_price

# ── Setup ─────────────────────────────────────────────────────────────────────
Path("logs").mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("logs/api.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
# Prevent UnicodeEncodeError on Windows cp1252 terminals
import sys as _sys
if hasattr(_sys.stdout, 'reconfigure'):
    try: _sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
if hasattr(_sys.stderr, 'reconfigure'):
    try: _sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
logger = logging.getLogger(__name__)

ROOT              = Path(__file__).resolve().parent
PRICE_MODEL_PATH  = ROOT / "models" / "price_model" / "price_model.pkl"

app = Flask(__name__)
CORS(app)

_price_model = None


def startup():
    global _price_model
    if not PRICE_MODEL_PATH.exists():
        logger.info("Price model not found — auto-training...")
        try:
            from src.training.train_price_model import main as train_main
            train_main()
        except Exception as e:
            logger.error(f"Auto-training failed: {e}\n{traceback.format_exc()}")
            raise

    _price_model = load_price_model(PRICE_MODEL_PATH)
    logger.info("Price model loaded OK.")
    logger.info("Condition model (OneClassSVM + CV) ready.")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _save_temp_image(file) -> Path:
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(file.read())
        return Path(tmp.name)


def _sanitize(obj):
    """Recursively convert numpy scalars to plain Python types for JSON serialization."""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitize(v) for v in obj]
    if hasattr(obj, 'item'):   # numpy.bool_, numpy.int64, numpy.float64 …
        return obj.item()
    return obj


def _defect_to_dict(d) -> dict:
    return {
        "name":         d.name,
        "severity":     d.severity,
        "description":  d.description,
        "score_penalty": d.score_penalty,
    }


def _severity_level(defects: list) -> str:
    """Overall alert level based on worst single defect."""
    if any(d.severity == "severe" for d in defects):
        return "danger"
    if any(d.severity == "moderate" for d in defects):
        return "warning"
    if defects:
        return "info"
    return "success"


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":        "ok",
        "price_model":   PRICE_MODEL_PATH.exists(),
        "condition_model": "oneclass_svm + opencv",
    })


@app.route("/scan-defects", methods=["POST"])
def scan_defects():
    """
    POST /scan-defects
    ------------------
    Accepts either:
      A) JSON body with { image_path (str), category, brand }
      B) multipart form with image (file), category, brand

    No original_price needed — price from market median by condition.
    """
    # ── A) JSON with server-side path (from Node.js proxy) ────────────────────
    if request.is_json:
        data      = request.get_json()
        category  = data.get("category", "phone").strip().lower()
        brand     = data.get("brand", "Other").strip()
        img_path_str = data.get("image_path", "")
        if not img_path_str:
            return jsonify({"error": "image_path is required in JSON body"}), 400
        img_path = Path(img_path_str)
        if not img_path.exists():
            return jsonify({"error": f"Image not found at path: {img_path_str}"}), 400
        try:
            result = detect_condition(img_path)
        except Exception as e:
            logger.error(traceback.format_exc())
            return jsonify({"error": f"Condition detection failed: {e}"}), 500

    # ── B) Multipart file upload ───────────────────────────────────────────────
    elif "image" in request.files and request.files["image"].filename:
        category = request.form.get("category", "phone").strip().lower()
        brand    = request.form.get("brand", "Other").strip()
        tmp_path = None
        try:
            tmp_path = _save_temp_image(request.files["image"])
            result   = detect_condition(tmp_path)
        except Exception as e:
            logger.error(traceback.format_exc())
            return jsonify({"error": f"Condition detection failed: {e}"}), 500
        finally:
            if tmp_path and tmp_path.exists():
                tmp_path.unlink(missing_ok=True)

    else:
        return jsonify({"error": "Send either JSON {image_path} or multipart {image file}"}), 400

    defects_list = [_defect_to_dict(d) for d in result.defects]
    alert_level  = _severity_level(result.defects)

    # Price: from market median (condition-based, no original_price)
    price = get_market_price(category, result.label)
    price_source = price.pop("source", "dataset_median")

    # Build a human-readable summary
    if not result.defects:
        summary = f"No defects detected. Device appears to be in {result.label.upper()} condition."
    else:
        defect_names = ", ".join(d.name for d in result.defects[:3])
        summary = (
            f"Found {len(result.defects)} defect(s): {defect_names}. "
            f"Condition rated as {result.label.upper()}."
        )

    logger.info(
        f"scan-defects | {brand} {category} | "
        f"condition={result.label} ({result.score}) | "
        f"defects={len(result.defects)} | "
        f"price=INR {price['amount']:,}"
    )

    return jsonify(_sanitize({
        "condition": {
            "label":      result.label,
            "score":      int(result.score),
            "confidence": float(result.confidence),
        },
        "defects":      defects_list,
        "alert_level":  alert_level,
        "has_defects":  bool(len(result.defects) > 0),
        "is_anomaly":   bool(result.is_anomaly),
        "price":        price,
        "price_source": price_source,
        "summary":      summary,
        "breakdown":    result.breakdown,
    }))


@app.route("/condition", methods=["POST"])
def condition_endpoint():
    """POST /condition — image only → condition + defects."""
    if "image" not in request.files or not request.files["image"].filename:
        return jsonify({"error": "No image uploaded"}), 400

    tmp_path = None
    try:
        tmp_path = _save_temp_image(request.files["image"])
        result   = detect_condition(tmp_path)
    except Exception as e:
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    finally:
        if tmp_path and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)

    return jsonify(_sanitize({
        "label":      result.label,
        "confidence": float(result.confidence),
        "score":      int(result.score),
        "defects":    [_defect_to_dict(d) for d in result.defects],
        "breakdown":  result.breakdown,
    }))


@app.route("/estimate", methods=["POST"])
def estimate_endpoint():
    """
    POST /estimate
    Full estimation with original_price, age, brand, etc.
    Falls back to market median if original_price is not provided.
    """
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    brand         = data.get("brand", "Other")
    category      = data.get("category", "phone")
    original_price = float(data.get("original_price", 0) or 0)
    age_months    = int(float(data.get("age_months", 12)))
    ram_gb        = int(float(data.get("ram_gb", 0) or 0))
    storage_gb    = int(float(data.get("storage_gb", 128) or 128))
    has_original_box = bool(int(data.get("has_original_box", 0) or 0))
    num_repairs   = int(data.get("num_repairs", 0) or 0)
    image_path_str = data.get("image_path", None)

    condition_result = None

    if "image" in request.files and request.files["image"].filename:
        tmp_path = None
        try:
            tmp_path = _save_temp_image(request.files["image"])
            condition_result = detect_condition(tmp_path)
        except Exception as e:
            logger.warning(f"Image analysis failed: {e}")
        finally:
            if tmp_path and tmp_path.exists():
                tmp_path.unlink(missing_ok=True)
    elif image_path_str:
        img_path = Path(image_path_str)
        if not img_path.is_absolute():
            img_path = Path(os.getcwd()) / img_path
        if img_path.exists():
            try:
                condition_result = detect_condition(img_path)
            except Exception as e:
                logger.warning(f"Image path analysis failed: {e}")

    condition_score = condition_result.score if condition_result else 60
    condition_label = condition_result.label if condition_result else "good"

    # If no original_price given, use market median as base for ML estimate
    if original_price <= 0:
        market = get_market_price(category, condition_label)
        original_price = market["amount"] * 1.8   # rough original price proxy

    try:
        price = estimate_price(
            brand=brand,
            category=category,
            age_months=age_months,
            original_price=original_price,
            condition_score=condition_score,
            condition_label=condition_label,
            model=_price_model,
            ram_gb=ram_gb,
            storage_gb=storage_gb,
            has_original_box=has_original_box,
            num_repairs=num_repairs,
        )

        return jsonify({
            "condition": {
                "label":      condition_label,
                "score":      condition_score,
                "confidence": condition_result.confidence if condition_result else 0.5,
                "defects":    [_defect_to_dict(d) for d in condition_result.defects] if condition_result else [],
                "breakdown":  condition_result.breakdown if condition_result else {},
            },
            "price": {
                "amount":    price.amount,
                "min_price": price.min_price,
                "max_price": price.max_price,
                "currency":  "INR",
            },
            "breakdown": price.breakdown,
            "model_used": "ml_trained",
        })

    except Exception as e:
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


# ── Startup ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("SmartGoal Resale Price Estimation API")
    logger.info("=" * 60)
    startup()
    logger.info("Endpoints:")
    logger.info("  GET  /health       -- status check")
    logger.info("  POST /scan-defects -- image -> defects + price (main)")
    logger.info("  POST /condition    -- image -> condition score + defects")
    logger.info("  POST /estimate     -- metadata + image -> price estimate")
    app.run(host="0.0.0.0", port=5002, debug=False)
