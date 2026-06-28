"""Pydantic models for request/response validation."""

from typing import List, Dict, Optional
from pydantic import BaseModel, Field


# ─── AQI Category Helper ───────────────────────────────────────────────────────

def get_aqi_category(aqi: float) -> str:
    """Return the AQI category string for a given AQI value."""
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Moderate"
    elif aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    elif aqi <= 200:
        return "Unhealthy"
    elif aqi <= 300:
        return "Very Unhealthy"
    else:
        return "Hazardous"


# ─── Prediction Schemas ────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    model_name: str
    state: str
    city: str
    pollutant_id: str
    latitude: float
    longitude: float
    pollutant_min: float
    pollutant_max: float


class PredictResponse(BaseModel):
    predicted_aqi: float
    category: str
    model_name: str


# ─── Forecast Schemas ──────────────────────────────────────────────────────────

class ForecastRequest(BaseModel):
    forecast_days: int = Field(..., ge=1, le=30)


class ForecastDay(BaseModel):
    date: str
    predicted_aqi: float
    category: str


class ForecastSummary(BaseModel):
    min: float
    max: float
    avg: float


class ForecastResponse(BaseModel):
    forecasts: List[ForecastDay]
    summary: ForecastSummary


# ─── Route Schemas ──────────────────────────────────────────────────────────────

class RouteRequest(BaseModel):
    start_location: str
    end_location: str
    search_radius_km: float = Field(default=10.0)


class RouteDetail(BaseModel):
    coords: List[List[float]]
    distance_km: float


class RouteResponse(BaseModel):
    shortest_route: RouteDetail
    healthiest_route: RouteDetail
    start_coords: List[float]
    end_coords: List[float]
    center_coords: List[float]


# ─── Explainability Schemas ─────────────────────────────────────────────────────

class ExplainRequest(BaseModel):
    model_name: str
    state: str
    city: str
    pollutant_id: str
    latitude: float
    longitude: float
    pollutant_min: float
    pollutant_max: float
    method: str = Field(..., pattern="^(shap|lime|permutation)$")


class FeatureImportance(BaseModel):
    name: str
    importance: float
    direction: str


class ExplainResponse(BaseModel):
    features: List[FeatureImportance]


# ─── Metadata Schemas ──────────────────────────────────────────────────────────

class MetadataResponse(BaseModel):
    states: List[str]
    cities_by_state: Dict[str, List[str]]
    pollutants: List[str]
    models: List[str]
