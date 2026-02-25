from fastapi import APIRouter
from typing import Any

router = APIRouter()

@router.get("/memberships")
async def get_memberships() -> list[Any]:
    return [
        {
            "id": "mem_1",
            "tenantName": "Example Tenant",
            "planName": "Basic Plan",
            "status": "active",
            "discordRoleStatus": "granted",
            "nextBillingDate": "2024-03-01",
            "price": 1000
        }
    ]
