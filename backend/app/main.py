from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS configuration
if settings.FRONTEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.FRONTEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/readyz")
def readyz():
    if not settings.STRIPE_WEBHOOK_SECRET:
        # Fail closed if secrets are missing
        return {"status": "error", "message": "Stripe Webhook Secret not configured"}
    return {"status": "ready"}

app.include_router(api_router, prefix=settings.API_V1_STR)
