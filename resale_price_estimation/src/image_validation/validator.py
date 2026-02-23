from dataclasses import dataclass
from pathlib import Path


@dataclass
class ImageValidationResult:
    is_valid: bool
    reason: str = ""


def validate_image(path: Path) -> ImageValidationResult:
    if not path.exists():
        return ImageValidationResult(False, "Image not found")
    if path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
        return ImageValidationResult(False, "Unsupported image format")
    return ImageValidationResult(True, "OK")
