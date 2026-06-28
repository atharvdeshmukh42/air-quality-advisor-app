"""Prediction and metadata API routes."""

import os
import joblib
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException

from .firebase_auth import get_current_user

from .schemas import (
    PredictRequest,
    PredictResponse,
    MetadataResponse,
    get_aqi_category,
)

router = APIRouter()

# ─── Paths ──────────────────────────────────────────────────────────────────────

_BASE_DIR = os.path.dirname(os.path.dirname(__file__))
_MODELS_DIR = os.path.join(_BASE_DIR, "models")
_DATA_DIR = os.path.join(_BASE_DIR, "data")
_CSV_PATH = os.path.join(_DATA_DIR, "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69.csv")

# ─── Model Name → File Mapping ──────────────────────────────────────────────────

MODEL_FILES = {
    "SVR": "svr_model.joblib",
    "Random Forest": "random_forest_model.joblib",
    "Gradient Boosting": "gradient_boosting_model.joblib",
    "LightGBM": "lightgbm_model.joblib",
    "Ridge Regression": "ridge_regression_model.joblib",
    "Linear Regression": "linear_regression_model.joblib",
}

# ─── In-Memory Cache ────────────────────────────────────────────────────────────

_model_cache: dict = {}
_metadata_cache: dict = {}


def _load_model(model_name: str):
    """Load a model from disk or return cached version."""
    if model_name in _model_cache:
        return _model_cache[model_name]

    filename = MODEL_FILES.get(model_name)
    if filename is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown model: '{model_name}'. "
                   f"Available models: {list(MODEL_FILES.keys())}",
        )

    path = os.path.join(_MODELS_DIR, filename)
    if not os.path.isfile(path):
        raise HTTPException(
            status_code=500,
            detail=f"Model file not found: {filename}",
        )

    try:
        model = joblib.load(path)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load model '{model_name}': {str(e)}",
        )

    _model_cache[model_name] = model
    return model


def _load_metadata() -> dict:
    """Load and cache metadata extracted from the CSV."""
    if _metadata_cache:
        return _metadata_cache

    try:
        df = pd.read_csv(_CSV_PATH)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load CSV data: {str(e)}",
        )

    states = sorted(df["state"].dropna().unique().tolist())
    cities_by_state = (
        df.dropna(subset=["state", "city"])
        .groupby("state")["city"]
        .apply(lambda x: sorted(x.unique().tolist()))
        .to_dict()
    )
    pollutants = sorted(df["pollutant_id"].dropna().unique().tolist())

    _metadata_cache["states"] = states
    _metadata_cache["cities_by_state"] = cities_by_state
    _metadata_cache["pollutants"] = pollutants
    _metadata_cache["models"] = list(MODEL_FILES.keys())

    return _metadata_cache


# ─── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/api/metadata", response_model=MetadataResponse)
async def get_metadata(user: dict = Depends(get_current_user)):
    """Return unique states, cities grouped by state, pollutants, and model names."""
    try:
        meta = _load_metadata()
        return MetadataResponse(**meta)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/predict", response_model=PredictResponse)
async def predict(request: PredictRequest, user: dict = Depends(get_current_user)):
    """Run AQI prediction using the specified model."""
    try:
        model = _load_model(request.model_name)

        input_df = pd.DataFrame([{
            "state": request.state,
            "city": request.city,
            "pollutant_id": request.pollutant_id,
            "latitude": request.latitude,
            "longitude": request.longitude,
            "pollutant_min": request.pollutant_min,
            "pollutant_max": request.pollutant_max,
        }])

        prediction = model.predict(input_df)
        predicted_aqi = float(prediction[0])
        category = get_aqi_category(predicted_aqi)

        return PredictResponse(
            predicted_aqi=round(predicted_aqi, 2),
            category=category,
            model_name=request.model_name,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}",
        )
