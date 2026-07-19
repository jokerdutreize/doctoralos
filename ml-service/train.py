"""
Trains the mortality-risk logistic regression model on the exported patient
cohort and writes a plain-JSON artifact that Django reads directly (no
scikit-learn dependency needed at inference time).

With only 8 recorded deaths in the cohort, this is deliberately kept to the
smallest reasonable model: MELD score alone, which is itself a validated
mortality risk score in transplant hepatology. cold_ischemia_time is fitted
as a comparison model and only kept if it clearly improves cross-validated
AUC over MELD alone.

Usage (from ml-service/ directory, with venv active):
    python train.py
"""
import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import LeaveOneOut, cross_val_predict
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler

DATA_PATH = "data/patients_training.csv"
MODEL_PATH = "models/mortality_model.json"


def _fit_and_score(df: pd.DataFrame, features: list[str]) -> dict:
    """Fit a standardized logistic regression on `features`, evaluated via
    leave-one-out cross-validation (appropriate given only 8 positive events)."""
    sub = df.dropna(subset=features)
    X = sub[features].to_numpy(dtype=float)
    y = sub["event"].to_numpy(dtype=int)

    scaler = StandardScaler().fit(X)
    X_scaled = scaler.transform(X)

    model = LogisticRegression(class_weight="balanced")
    cv_probs = cross_val_predict(
        model, X_scaled, y, cv=LeaveOneOut(), method="predict_proba",
    )[:, 1]
    cv_auc = roc_auc_score(y, cv_probs)

    model.fit(X_scaled, y)

    return {
        "features": features,
        "scaler_mean": scaler.mean_.tolist(),
        "scaler_scale": scaler.scale_.tolist(),
        "coef": model.coef_[0].tolist(),
        "intercept": float(model.intercept_[0]),
        "cv_auc": float(cv_auc),
        "n_events": int(y.sum()),
        "n_total": int(len(y)),
    }


def main():
    df = pd.read_csv(DATA_PATH)

    baseline = _fit_and_score(df, ["meld_score"])
    print(f"MELD-only model:  CV AUC = {baseline['cv_auc']:.3f}  "
          f"(n={baseline['n_total']}, events={baseline['n_events']})")

    candidate = None
    if df["cold_ischemia_time"].notna().sum() >= df["meld_score"].notna().sum() * 0.9:
        candidate = _fit_and_score(df, ["meld_score", "cold_ischemia_time"])
        print(f"MELD + cold ischemia model:  CV AUC = {candidate['cv_auc']:.3f}  "
              f"(n={candidate['n_total']}, events={candidate['n_events']})")

    chosen = baseline
    if candidate is not None and candidate["cv_auc"] > baseline["cv_auc"] + 0.02:
        chosen = candidate
        print("-> Selecting MELD + cold ischemia model (clear AUC improvement).")
    else:
        print("-> Selecting MELD-only model.")

    chosen["trained_at"] = datetime.now(timezone.utc).isoformat()
    chosen["caveat"] = (
        f"Exploratory pilot model trained on a single-center cohort with only "
        f"{chosen['n_events']} recorded deaths out of {chosen['n_total']} patients. "
        f"Not clinically validated — treat probability estimates as directional, "
        f"not diagnostic."
    )

    print(f"\nWARNING: only {chosen['n_events']} positive events — "
          f"treat this as an exploratory pilot model, not a clinically validated one.")

    import os
    os.makedirs("models", exist_ok=True)
    with open(MODEL_PATH, "w", encoding="utf-8") as fh:
        json.dump(chosen, fh, indent=2)
    print(f"\nWrote {MODEL_PATH}")


if __name__ == "__main__":
    main()
