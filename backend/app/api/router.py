from fastapi import APIRouter
from app.api.endpoints import platform, seller, buyer

api_router = APIRouter()

api_router.include_router(platform.router, prefix="/platform", tags=["platform"])
api_router.include_router(seller.router, prefix="/seller", tags=["seller"])
api_router.include_router(buyer.router, prefix="/buyer", tags=["buyer"])
