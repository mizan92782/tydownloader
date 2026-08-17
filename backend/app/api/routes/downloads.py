import os
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import redis

from app.core.config import settings
from app.db.database import get_db
from app.db.repositories.download_repo import DownloadRepository
from app.schemas.download import DownloadRequest, DownloadResponse, DownloadStatusResponse
from app.workers.tasks import download_media_task
from app.workers.celery_app import celery

router = APIRouter()
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

@router.post("", response_model=DownloadResponse)
def create_download(payload: DownloadRequest, db: Session = Depends(get_db)):
    if payload.type not in ["video", "audio", "thumbnail"]:
        raise HTTPException(status_code=400, detail="Invalid media type. Must be video, audio, or thumbnail.")

    # Create Database record
    db_download = DownloadRepository.create(
        db=db,
        url=payload.url,
        media_type=payload.type,
        quality=payload.quality
    )

    # Queue Celery task
    download_media_task.delay(db_download.id)

    return DownloadResponse(
        download_id=db_download.id,
        status="queued"
    )

@router.get("", response_model=List[DownloadStatusResponse])
def list_downloads(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    downloads = DownloadRepository.get_all(db, skip, limit)
    res = []
    for d in downloads:
        # Construct basic schema
        item = DownloadStatusResponse.from_orm(d)
        
        # If currently downloading, merge redis stats
        if d.status == "downloading":
            redis_data = redis_client.get(f"download:{d.id}")
            if redis_data:
                try:
                    stats = json.loads(redis_data)
                    item.progress = stats.get("progress", d.progress)
                    item.speed = stats.get("speed")
                    item.eta = stats.get("eta")
                except json.JSONDecodeError:
                    pass
        res.append(item)
    return res

@router.get("/{download_id}", response_model=DownloadStatusResponse)
def get_download_status(download_id: str, db: Session = Depends(get_db)):
    d = DownloadRepository.get_by_id(db, download_id)
    if not d:
        raise HTTPException(status_code=404, detail="Download not found")

    item = DownloadStatusResponse.from_orm(d)
    
    # If downloading, load progress info from Redis
    if d.status == "downloading":
        redis_data = redis_client.get(f"download:{download_id}")
        if redis_data:
            try:
                stats = json.loads(redis_data)
                item.progress = stats.get("progress", d.progress)
                item.speed = stats.get("speed")
                item.eta = stats.get("eta")
            except json.JSONDecodeError:
                pass
                
    return item

@router.post("/{download_id}/cancel")
def cancel_download(download_id: str, db: Session = Depends(get_db)):
    d = DownloadRepository.get_by_id(db, download_id)
    if not d:
        raise HTTPException(status_code=404, detail="Download not found")

    if d.status in ["completed", "failed", "cancelled"]:
        return {"status": d.status, "message": f"Download is already in {d.status} state"}

    # 1. Signal cancellation in Redis
    redis_client.setex(f"download:{download_id}:cancel", 60, "true")

    # 2. Revoke active Celery task if running
    task_id = redis_client.get(f"download:{download_id}:task_id")
    if task_id:
        celery.control.revoke(task_id, terminate=True, signal="SIGTERM")

    # 3. Update Database status to cancelled
    DownloadRepository.update(db, download_id, status="cancelled", error_message="Cancelled by user")

    # 4. Clean up files
    try:
        for f in os.listdir(settings.DOWNLOAD_DIR):
            if f.startswith(download_id):
                file_path = os.path.join(settings.DOWNLOAD_DIR, f)
                if os.path.exists(file_path):
                    os.remove(file_path)
    except Exception:
        pass

    return {"status": "cancelled", "message": "Download cancellation requested"}

@router.get("/{download_id}/file")
def get_download_file(download_id: str, db: Session = Depends(get_db)):
    d = DownloadRepository.get_by_id(db, download_id)
    if not d:
        raise HTTPException(status_code=404, detail="Download not found")

    if d.status != "completed":
        raise HTTPException(status_code=400, detail=f"Download file is not ready. Status: {d.status}")

    file_path = d.file_path
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Downloaded file was not found on disk")

    filename = os.path.basename(file_path)
    # If the database has a sanitized video title, use it as download filename
    if d.title:
        ext = os.path.splitext(file_path)[1]
        # Clean title for Header disposition compatibility
        clean_title = "".join(c for c in d.title if c.isalnum() or c in "._- ").strip()
        filename = f"{clean_title}{ext}"

    return FileResponse(
        path=file_path,
        media_type="application/octet-stream",
        filename=filename
    )
