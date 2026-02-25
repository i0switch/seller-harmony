from fastapi import APIRouter, Query
from typing import Any
from app.schemas.common import PaginatedResponse
from pydantic import BaseModel

router = APIRouter()

class DiscordValidateRequest(BaseModel):
    guildId: str
    roleId: str | None = None

@router.get("/stats")
async def get_stats() -> Any:
    return {
        "totalMembers": 500,
        "activePlans": 3,
        "mrr": 200000,
        "churnRate": 0.05,
        "newMembersThisMonth": 20,
        "webhooksToday": 15
    }

@router.get("/plans")
async def get_plans() -> list[Any]:
    return [
        {"id": "p1", "name": "Basic Plan", "price": 1000, "status": "active", "stripeProductId": "prod_1", "roleId": "r1"}
    ]

@router.get("/plans/{plan_id}")
async def get_plan_by_id(plan_id: str) -> Any:
    return {"id": plan_id, "name": "Basic Plan", "price": 1000, "status": "active", "stripeProductId": "prod_1", "roleId": "r1"}

@router.get("/members")
async def get_members(page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100)) -> PaginatedResponse[Any]:
    return PaginatedResponse(
        items=[{"id": "m1", "name": "Member 1", "email": "m1@example.com", "planId": "p1", "billingStatus": "active", "discordUsername": "member1#1234", "discordRoleGranted": True, "joinedAt": "2024-01-10"}],
        page=page,
        page_size=page_size,
        total_count=1
    )

@router.get("/members/{member_id}")
async def get_member_by_id(member_id: str) -> Any:
    return {"id": member_id, "name": "Member 1", "email": "m1@example.com"}

@router.get("/members/{member_id}/timeline")
async def get_member_timeline(member_id: str) -> list[Any]:
    return []

@router.get("/crosscheck")
async def get_crosscheck() -> list[Any]:
    return []

@router.get("/webhooks")
async def get_webhooks(page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100)) -> PaginatedResponse[Any]:
    return PaginatedResponse(items=[], page=page, page_size=page_size, total_count=0)

@router.post("/discord/validate")
async def validate_discord(payload: DiscordValidateRequest) -> Any:
    return {
        "botInstalled": True,
        "manageRolesPermission": True,
        "roleExists": True if payload.roleId else False,
        "botRoleHierarchy": True if payload.roleId else False,
        "errorCode": None,
        "errorMessage": None
    }
