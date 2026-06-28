"""Air Quality Predictor & Yoga Advisor — FastAPI Backend."""

# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from api.predict import router as predict_router
from api.forecast import router as forecast_router
from api.route import router as route_router
from api.explain import router as explain_router
from api.firebase_auth import router as auth_router, init_firebase
from api.buddy import router as buddy_router

# ─── App Setup ──────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Air Quality Predictor & Yoga Advisor API",
    description="Backend API for AQI prediction, forecasting, route planning, and model explainability.",
    version="1.0.0",
)

# ─── CORS ───────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ────────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(predict_router)
app.include_router(forecast_router)
app.include_router(route_router)
app.include_router(explain_router)
app.include_router(buddy_router)


# ─── Startup Event ──────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """Pre-load metadata and models on startup for faster first requests."""
    import logging

    logger = logging.getLogger("uvicorn.error")
    logger.info("🚀  Server starting up — pre-loading metadata …")

    # Initialise Firebase Admin SDK
    try:
        init_firebase()
    except Exception as e:
        logger.warning(f"⚠️  Firebase init failed: {e}")

    # Pre-load metadata (CSV parsing)
    try:
        from api.predict import _load_metadata
        _load_metadata()
        logger.info("✅  Metadata loaded successfully")
    except Exception as e:
        logger.warning(f"⚠️  Metadata pre-load failed (will retry on first request): {e}")

    logger.info("✅  Startup complete")


# ─── Root Health Check ──────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "Air Quality Predictor API",
        "docs": "/docs",
    }
