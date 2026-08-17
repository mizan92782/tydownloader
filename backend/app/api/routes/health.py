from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.utils.ffmpeg_utils import verify_ffmpeg
import redis
from app.core.config import settings

router = APIRouter()

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    health_status = {
        "status": "healthy",
        "database": "connected",
        "redis": "connected",
        "ffmpeg": "available"
    }

    # Verify Database
    try:
        db.execute("SELECT 1")
    except Exception:
        health_status["database"] = "disconnected"
        health_status["status"] = "unhealthy"

    # Verify Redis
    try:
        r = redis.Redis.from_url(settings.REDIS_URL)
        r.ping()
    except Exception:
        health_status["redis"] = "disconnected"
        health_status["status"] = "unhealthy"

    # Verify FFmpeg
    if not verify_ffmpeg():
        health_status["ffmpeg"] = "missing"
        health_status["status"] = "unhealthy"

    return health_status
