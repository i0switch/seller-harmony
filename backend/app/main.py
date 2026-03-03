from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.router import api_router
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Global exception handler to prevent stack trace leakage
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# CORS configuration - restrict methods and headers for production
allowed_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
allowed_headers = [
    "authorization", "content-type", "x-requested-with",
    "x-client-info", "apikey",
]

if settings.FRONTEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.FRONTEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=allowed_methods,
        allow_headers=allowed_headers,
    )

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/readyz")
def readyz():
    errors = []
    if not settings.STRIPE_WEBHOOK_SECRET:
        errors.append("Stripe Webhook Secret not configured")
    if not settings.SUPABASE_URL:
        errors.append("Supabase URL not configured")
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        errors.append("Supabase Service Role Key not configured")
    if errors:
        return {"status": "error", "messages": errors}
    return {"status": "ready"}

app.include_router(api_router, prefix=settings.API_V1_STR)
