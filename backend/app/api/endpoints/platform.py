from fastapi import APIRouter, Query
from typing import Any
from app.schemas.common import PaginatedResponse

router = APIRouter()

@router.get("/stats")
async def get_stats() -> Any:
    return {
        "activeTenants": 10,
        "trialTenants": 5,
        "suspendedTenants": 1,
        "canceledTenants": 2,
        "totalMembers": 1000,
        "totalMRR": 500000,
        "webhookFailures": 0,
        "retryPending": 3,
        "discordApiFailures": 0,
        "unresolvedAlerts": 1
    }

@router.get("/tenants")
async def get_tenants(page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100)) -> PaginatedResponse[Any]:
    return PaginatedResponse(
        items=[{"id": "t1", "name": "Tenant 1", "status": "active", "email": "t1@example.com", "planId": "pro", "joinedAt": "2024-01-01", "memberCount": 500, "mrr": 200000, "lastActiveAt": "2024-02-25"}],
        page=page,
        page_size=page_size,
        total_count=1
    )

@router.get("/tenants/{tenant_id}")
async def get_tenant_by_id(tenant_id: str) -> Any:
    return {"id": tenant_id, "name": f"Tenant {tenant_id}", "status": "active"}

@router.get("/webhooks")
async def get_webhooks(page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100)) -> PaginatedResponse[Any]:
    return PaginatedResponse(items=[], page=page, page_size=page_size, total_count=0)

@router.get("/retry-queue")
async def get_retry_queue(page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100)) -> PaginatedResponse[Any]:
    return PaginatedResponse(items=[], page=page, page_size=page_size, total_count=0)

@router.get("/announcements")
async def get_announcements() -> list[Any]:
    return []

@router.get("/kill-switches")
async def get_kill_switches() -> list[Any]:
    return []
