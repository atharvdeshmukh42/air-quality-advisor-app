"""LSTM-based AQI forecast API route."""

import os
import joblib
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException

from .firebase_auth import get_current_user

from .schemas import (
    ForecastRequest,
    ForecastResponse,
    ForecastDay,
    ForecastSummary,
    get_aqi_category,
)

router = APIRouter()

# ─── Paths ──────────────────────────────────────────────────────────────────────

_BASE_DIR = os.path.dirname(os.path.dirname(__file__))
_MODELS_DIR = os.path.join(_BASE_DIR, "models")
_DATA_DIR = os.path.join(_BASE_DIR, "data")
_LSTM_PATH = os.path.join(_MODELS_DIR, "aqi_lstm_model.h5")
_SCALER_PATH = os.path.join(_MODELS_DIR, "aqi_scaler.pkl")
_PUNE_CSV_PATH = os.path.join(_DATA_DIR, "aqi_data_pune_2017_to_2024.csv")

WINDOW_SIZE = 60

# ─── Global Keras Initialization (Main Thread) ──────────────────────────────────
import logging
logger = logging.getLogger("uvicorn.error")

try:
    import tensorflow as tf
    # Disable GPU/Metal to prevent deadlocks in uvicorn workers on macOS
    tf.config.set_visible_devices([], 'GPU')
    from tensorflow.keras.models import load_model  # type: ignore
except Exception as e:
    logger.error(f"Failed to initialize TensorFlow: {e}")

_lstm_model = None
_scaler = None

def _load_lstm_model():
    """Load and cache the LSTM model on first request."""
    global _lstm_model
    if _lstm_model is not None:
        return _lstm_model

    try:
        logger.info("Loading LSTM model (this may take up to 60 seconds)...")
        _lstm_model = load_model(_LSTM_PATH)
        logger.info("LSTM model loaded.")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load LSTM model: {str(e)}",
        )
    return _lstm_model

def _load_scaler():
    """Load and cache the MinMaxScaler."""
    global _scaler
    if _scaler is not None:
        return _scaler

    try:
        _scaler = joblib.load(_SCALER_PATH)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load scaler: {str(e)}",
        )
    return _scaler


def _load_pune_aqi_data() -> np.ndarray:
    """Load the Pune AQI CSV data, sort by date, and return AQI values."""
    try:
        df = pd.read_csv(_PUNE_CSV_PATH)

        # Build a datetime column from Year, Month, Day
        df["DateTime"] = pd.to_datetime(
            df[["Year", "Month", "Day"]].rename(
                columns={"Year": "year", "Month": "month", "Day": "day"}
            )
        )
        df = df.sort_values("DateTime").reset_index(drop=True)

        aqi_values = df["AQI"].values.astype(float)
        return aqi_values

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load Pune AQI data: {str(e)}",
        )


# ─── Route ──────────────────────────────────────────────────────────────────────

@router.post("/api/forecast", response_model=ForecastResponse)
async def forecast(request: ForecastRequest, user: dict = Depends(get_current_user)):
    """Forecast AQI for the next N days using the LSTM model."""
    try:
        model = _load_lstm_model()
        scaler = _load_scaler()
        aqi_values = _load_pune_aqi_data()

        # Scale the data
        aqi_scaled = scaler.transform(aqi_values.reshape(-1, 1)).flatten()

        # Use the last WINDOW_SIZE values as the seed
        if len(aqi_scaled) < WINDOW_SIZE:
            raise HTTPException(
                status_code=500,
                detail=f"Not enough data for forecasting. "
                       f"Need at least {WINDOW_SIZE} records, got {len(aqi_scaled)}.",
            )

        seed = list(aqi_scaled[-WINDOW_SIZE:])
        predictions_scaled = []

        # Iteratively predict N days ahead
        for _ in range(request.forecast_days):
            input_seq = np.array(seed[-WINDOW_SIZE:]).reshape(1, WINDOW_SIZE, 1)
            pred = model(input_seq, training=False)
            pred_val = float(pred.numpy()[0, 0])
            predictions_scaled.append(pred_val)
            seed.append(pred_val)

        # Inverse transform to get actual AQI values
        predictions = scaler.inverse_transform(
            np.array(predictions_scaled).reshape(-1, 1)
        ).flatten()

        # Build response
        today = datetime.now().date()
        forecasts = []
        for i, aqi_val in enumerate(predictions):
            forecast_date = today + timedelta(days=i + 1)
            aqi_rounded = round(float(aqi_val), 2)
            forecasts.append(
                ForecastDay(
                    date=forecast_date.isoformat(),
                    predicted_aqi=aqi_rounded,
                    category=get_aqi_category(aqi_rounded),
                )
            )

        aqi_list = [f.predicted_aqi for f in forecasts]
        summary = ForecastSummary(
            min=round(min(aqi_list), 2),
            max=round(max(aqi_list), 2),
            avg=round(sum(aqi_list) / len(aqi_list), 2),
        )

        return ForecastResponse(forecasts=forecasts, summary=summary)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Forecast failed: {str(e)}",
        )
