import pytest
from unittest.mock import patch

def test_health_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert "redis" in data

def test_media_info_invalid_url(client):
    response = client.get("/api/v1/media/info?url=invalid_url")
    assert response.status_code == 400
    assert "detail" in response.json()

@patch("app.api.routes.media.fetch_media_info")
def test_media_info_success(mock_fetch, client):
    mock_fetch.return_value = {
        "id": "12345",
        "title": "Test Video Title",
        "channel": "Test Channel",
        "duration": 180,
        "thumbnail": "https://example.com/thumb.jpg",
        "available_qualities": [360, 720, 1080],
        "description": "Test Description"
    }
    response = client.get("/api/v1/media/info?url=https://youtube.com/watch?v=12345")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "12345"
    assert data["title"] == "Test Video Title"
    assert 720 in data["available_qualities"]

@patch("app.api.routes.downloads.download_media_task.delay")
def test_create_download_video(mock_delay, client):
    mock_delay.return_value = None
    response = client.post("/api/v1/downloads", json={
        "url": "https://youtube.com/watch?v=12345",
        "type": "video",
        "quality": "720"
    })
    assert response.status_code == 200
    data = response.json()
    assert "download_id" in data
    assert data["status"] == "queued"
    mock_delay.assert_called_once()

def test_get_nonexistent_download_status(client):
    response = client.get("/api/v1/downloads/nonexistent-id")
    assert response.status_code == 404
