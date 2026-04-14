import base64
from dataclasses import dataclass
from typing import Dict, List


@dataclass
class PredictionResult:
    result: str
    confidence: float

    def to_dict(self) -> Dict:
        return {"result": self.result, "confidence": round(float(self.confidence), 4)}


def _safe_image_length(image_base64: str) -> int:
    if not image_base64:
        return 0
    try:
        return len(base64.b64decode(image_base64.encode("utf-8"), validate=False))
    except Exception:
        return len(image_base64)


def predict_disease_from_image(image_base64: str) -> PredictionResult:
    image_len = _safe_image_length(image_base64)
    classes = ["healthy", "leaf_blight", "powdery_mildew", "rust"]
    selected = classes[image_len % len(classes)]
    confidence = 0.76 + (image_len % 20) / 100
    return PredictionResult(result=selected, confidence=min(confidence, 0.98))


def predict_soil_health(npk: List[float]) -> PredictionResult:
    if not npk or len(npk) < 3:
        return PredictionResult(result="0", confidence=0.0)

    n, p, k = [float(v) for v in npk[:3]]
    score = max(0.0, min(100.0, 0.35 * n + 0.30 * p + 0.35 * k))
    confidence = 0.70 + min(score / 500.0, 0.25)
    return PredictionResult(result=str(round(score, 2)), confidence=min(confidence, 0.95))


def predict_crop_grade(image_base64: str) -> PredictionResult:
    image_len = _safe_image_length(image_base64)
    grades = ["A", "B", "C"]
    grade = grades[image_len % 3]
    confidence = 0.75 + (image_len % 15) / 100
    return PredictionResult(result=grade, confidence=min(confidence, 0.97))
