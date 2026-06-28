"""Model explainability API route (SHAP, LIME, Permutation Importance)."""

import os
import warnings

import joblib
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException

from .firebase_auth import get_current_user
from sklearn.inspection import permutation_importance

from .schemas import ExplainRequest, ExplainResponse, FeatureImportance

router = APIRouter()

# ─── Paths ──────────────────────────────────────────────────────────────────────

_BASE_DIR = os.path.dirname(os.path.dirname(__file__))
_MODELS_DIR = os.path.join(_BASE_DIR, "models")
_DATA_DIR = os.path.join(_BASE_DIR, "data")
_CSV_PATH = os.path.join(_DATA_DIR, "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69.csv")

MODEL_FILES = {
    "SVR": "svr_model.joblib",
    "Random Forest": "random_forest_model.joblib",
    "Gradient Boosting": "gradient_boosting_model.joblib",
    "LightGBM": "lightgbm_model.joblib",
    "Ridge Regression": "ridge_regression_model.joblib",
    "Linear Regression": "linear_regression_model.joblib",
}

TREE_MODELS = {"Random Forest", "Gradient Boosting", "LightGBM"}

INPUT_COLUMNS = [
    "state", "city", "pollutant_id",
    "latitude", "longitude", "pollutant_min", "pollutant_max",
]

# ─── Cache ──────────────────────────────────────────────────────────────────────

_model_cache: dict = {}


def _load_model(model_name: str):
    if model_name in _model_cache:
        return _model_cache[model_name]

    filename = MODEL_FILES.get(model_name)
    if filename is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown model: '{model_name}'. "
                   f"Available: {list(MODEL_FILES.keys())}",
        )

    path = os.path.join(_MODELS_DIR, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=500, detail=f"Model file not found: {filename}")

    try:
        model = joblib.load(path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

    _model_cache[model_name] = model
    return model


def get_transformed_feature_names(preprocessor, original_columns):
    """Extract feature names after the ColumnTransformer preprocessing step."""
    feature_names = []
    for name, transformer, columns in preprocessor.transformers_:
        if name == "num":
            feature_names.extend(columns)
        elif name == "cat":
            if hasattr(transformer, "get_feature_names_out"):
                cat_features = transformer.get_feature_names_out(columns)
                feature_names.extend(cat_features)
    return feature_names


def _build_input_df(request: ExplainRequest) -> pd.DataFrame:
    return pd.DataFrame([{
        "state": request.state,
        "city": request.city,
        "pollutant_id": request.pollutant_id,
        "latitude": request.latitude,
        "longitude": request.longitude,
        "pollutant_min": request.pollutant_min,
        "pollutant_max": request.pollutant_max,
    }])


# ─── SHAP Explanation ───────────────────────────────────────────────────────────

def _explain_shap(model, input_df, model_name) -> list[FeatureImportance]:
    import shap

    pipeline = model
    preprocessor = pipeline.named_steps["preprocessor"]
    regressor = pipeline.named_steps["regressor"]

    X_transformed = preprocessor.transform(input_df)
    feature_names = get_transformed_feature_names(preprocessor, INPUT_COLUMNS)

    if model_name in TREE_MODELS:
        explainer = shap.TreeExplainer(regressor)
    else:
        # KernelExplainer needs a background dataset; use the single sample
        explainer = shap.KernelExplainer(
            regressor.predict,
            X_transformed,
        )

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        shap_values = explainer.shap_values(X_transformed)

    # shap_values may have shape (1, n_features) or be a list
    if isinstance(shap_values, list):
        shap_values = shap_values[0]
    shap_values = np.array(shap_values).flatten()

    # Build result sorted by absolute importance
    indices = np.argsort(np.abs(shap_values))[::-1]
    results = []
    for idx in indices[:15]:  # top 15
        name = feature_names[idx] if idx < len(feature_names) else f"feature_{idx}"
        val = float(shap_values[idx])
        results.append(FeatureImportance(
            name=str(name),
            importance=round(abs(val), 6),
            direction="increases" if val > 0 else "decreases",
        ))
    return results


# ─── LIME Explanation ───────────────────────────────────────────────────────────

def _explain_lime(model, input_df, model_name) -> list[FeatureImportance]:
    from lime.lime_tabular import LimeTabularExplainer

    pipeline = model
    preprocessor = pipeline.named_steps["preprocessor"]
    regressor = pipeline.named_steps["regressor"]

    X_transformed = preprocessor.transform(input_df)
    if hasattr(X_transformed, "toarray"):
        X_transformed = X_transformed.toarray()
    X_transformed = np.array(X_transformed, dtype=float)

    feature_names = get_transformed_feature_names(preprocessor, INPUT_COLUMNS)

    lime_explainer = LimeTabularExplainer(
        training_data=X_transformed,
        feature_names=feature_names,
        mode="regression",
        verbose=False,
    )

    explanation = lime_explainer.explain_instance(
        X_transformed[0],
        regressor.predict,
        num_features=15,
    )

    results = []
    for condition, weight in explanation.as_list():
        results.append(FeatureImportance(
            name=str(condition),
            importance=round(abs(weight), 6),
            direction="increases" if weight > 0 else "decreases",
        ))

    # Sort by importance descending
    results.sort(key=lambda x: x.importance, reverse=True)
    return results


# ─── Permutation Importance ─────────────────────────────────────────────────────

def _explain_permutation(model, input_df, model_name) -> list[FeatureImportance]:
    # Load a sample of the full dataset to compute permutation importance
    try:
        df = pd.read_csv(_CSV_PATH)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to load data for permutation: {str(e)}"
        )

    # Use a sample (max 500 rows) for speed
    sample_size = min(500, len(df))
    df_sample = df.sample(n=sample_size, random_state=42)

    X_sample = df_sample[INPUT_COLUMNS]
    y_sample = df_sample["pollutant_avg"]

    result = permutation_importance(
        model, X_sample, y_sample,
        n_repeats=10,
        random_state=42,
        scoring="neg_mean_squared_error",
    )

    importances = result.importances_mean
    indices = np.argsort(importances)[::-1]

    results = []
    for idx in indices:
        col = INPUT_COLUMNS[idx] if idx < len(INPUT_COLUMNS) else f"feature_{idx}"
        val = float(importances[idx])
        results.append(FeatureImportance(
            name=col,
            importance=round(abs(val), 6),
            direction="increases" if val > 0 else "decreases",
        ))
    return results


# ─── Route ──────────────────────────────────────────────────────────────────────

@router.post("/api/explainability", response_model=ExplainResponse)
async def explain(request: ExplainRequest, user: dict = Depends(get_current_user)):
    """Explain a prediction using SHAP, LIME, or permutation importance."""
    try:
        model = _load_model(request.model_name)
        input_df = _build_input_df(request)

        if request.method == "shap":
            features = _explain_shap(model, input_df, request.model_name)
        elif request.method == "lime":
            features = _explain_lime(model, input_df, request.model_name)
        elif request.method == "permutation":
            features = _explain_permutation(model, input_df, request.model_name)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown method: '{request.method}'. Use shap, lime, or permutation.",
            )

        return ExplainResponse(features=features)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Explainability failed: {str(e)}",
        )
