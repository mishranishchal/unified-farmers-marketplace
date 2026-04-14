from flask import Blueprint, request
from models.inference import (
    predict_crop_grade,
    predict_disease_from_image,
    predict_soil_health,
)

predict_bp = Blueprint("predict", __name__, url_prefix="/predict")


@predict_bp.post("/disease")
def disease():
    payload = request.get_json(silent=True) or {}
    image_base64 = payload.get("imageBase64", "")

    prediction = predict_disease_from_image(image_base64)
    return prediction.to_dict(), 200


@predict_bp.post("/soil")
def soil():
    payload = request.get_json(silent=True) or {}
    npk = payload.get("npk", [])

    prediction = predict_soil_health(npk)
    return prediction.to_dict(), 200


@predict_bp.post("/grading")
def grading():
    payload = request.get_json(silent=True) or {}
    image_base64 = payload.get("imageBase64", "")

    prediction = predict_crop_grade(image_base64)
    return prediction.to_dict(), 200
