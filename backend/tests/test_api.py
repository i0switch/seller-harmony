from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_get_platform_tenants_list():
    response = client.get("/api/platform/tenants")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "page" in data
    assert "total_count" in data

def test_get_seller_plan_detail():
    response = client.get("/api/seller/plans/p1")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "p1"
    assert "name" in data

def test_discord_validate_validation_error():
    # Missing required 'guildId'
    response = client.post("/api/seller/discord/validate", json={"roleId": "123"})
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert data["detail"][0]["loc"] == ["body", "guildId"]

def test_pagination_validation_error_page_too_small():
    # page must be >= 1
    response = client.get("/api/platform/tenants?page=0&page_size=10")
    assert response.status_code == 422
    data = response.json()
    assert data["detail"][0]["loc"] == ["query", "page"]
    assert data["detail"][0]["type"] == "greater_than_equal"

def test_pagination_validation_error_page_size_too_large():
    # page_size must be <= 100
    response = client.get("/api/seller/members?page=1&page_size=101")
    assert response.status_code == 422
    data = response.json()
    assert data["detail"][0]["loc"] == ["query", "page_size"]
    assert data["detail"][0]["type"] == "less_than_equal"

def test_pagination_validation_error_invalid_type():
    # page must be an integer
    response = client.get("/api/platform/webhooks?page=abc")
    assert response.status_code == 422
    data = response.json()
    assert data["detail"][0]["loc"] == ["query", "page"]
    assert data["detail"][0]["type"] == "int_parsing"
