"""
Loads the mortality-risk model artifact (trained offline by ml-service/train.py)
and scores patients against it. The artifact is plain JSON — scaler mean/scale,
logistic regression coefficients/intercept — so no scikit-learn dependency is
needed here; standardization + the sigmoid are computed directly.

Since the model is a standardized logistic regression, exact per-feature
Shapley/SHAP contributions reduce to a closed form: coef_i * x_i_scaled
(the scaler already mean-centers each feature). No `shap` package needed.
"""
import json
import math
from pathlib import Path

from django.conf import settings

MODEL_PATH = Path(settings.BASE_DIR).parent / "ml-service" / "models" / "mortality_model.json"

FEATURE_LABELS = {
    "meld_score": "MELD score",
    "cold_ischemia_time": "Cold ischemia time",
    "age": "Age",
}

_model = None


def _load_model() -> dict:
    global _model
    if _model is None:
        with open(MODEL_PATH, "r", encoding="utf-8") as fh:
            _model = json.load(fh)
    return _model


def model_available() -> bool:
    return MODEL_PATH.exists()


def predict_mortality(patient) -> dict | None:
    """Returns None if the patient is missing a required feature value."""
    model = _load_model()
    features = model["features"]

    raw_values = [getattr(patient, f, None) for f in features]
    if any(v is None for v in raw_values):
        return None

    scaled = [
        (v - mean) / scale
        for v, mean, scale in zip(raw_values, model["scaler_mean"], model["scaler_scale"])
    ]
    contributions_raw = [c * x for c, x in zip(model["coef"], scaled)]
    logit = model["intercept"] + sum(contributions_raw)
    probability = 1 / (1 + math.exp(-logit))

    total_abs = sum(abs(c) for c in contributions_raw) or 1.0
    contributions = [
        {
            "label": FEATURE_LABELS.get(f, f),
            "contribution_pct": round(abs(c) / total_abs * 100, 1),
            "direction": "increases_risk" if c > 0 else "decreases_risk",
        }
        for f, c in zip(features, contributions_raw)
    ]
    contributions.sort(key=lambda c: c["contribution_pct"], reverse=True)

    if probability >= 0.5:
        risk_band = "high"
    elif probability >= 0.2:
        risk_band = "moderate"
    else:
        risk_band = "low"

    return {
        "probability": round(probability, 4),
        "risk_band": risk_band,
        "contributions": contributions,
        "model_info": {
            "features": features,
            "n_events": model["n_events"],
            "n_total": model["n_total"],
            "cv_auc": round(model["cv_auc"], 3),
            "trained_at": model["trained_at"],
            "caveat": model["caveat"],
        },
    }
