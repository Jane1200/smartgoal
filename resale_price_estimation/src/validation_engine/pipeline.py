from pathlib import Path

from src.condition_detection.detector import detect_condition
from src.image_validation.validator import validate_image
from src.price_estimation.estimator import estimate_price


def run_pipeline() -> None:
    sample_path = Path("data/raw_images/sample.jpg")
    validation = validate_image(sample_path)
    if not validation.is_valid:
        print(f"Validation failed: {validation.reason}")
        return

    condition = detect_condition(sample_path)
    estimate = estimate_price(condition.label, base_price=10000)
    print(f"Condition: {condition.label} ({condition.confidence:.2f})")
    print(f"Estimated price: {estimate.amount} {estimate.currency}")
