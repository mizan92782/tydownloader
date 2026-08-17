import os
import json
from datetime import datetime
import urllib.request
import redis
from app.workers.celery_app import celery
from app.db.database import SessionLocal
from app.db.repositories.download_repo import DownloadRepository
from app.core.config import settings
from app.core.logging import logger
from app.utils.yt_dlp_utils import download_media, fetch_media_info

# Initialize redis connection
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

class CancelledError(Exception):
    pass

def create_progress_hook(download_id: str):
    def progress_hook(d):
        # Check if cancellation was requested
        cancel_requested = redis_client.get(f"download:{download_id}:cancel")
        if cancel_requested:
            raise CancelledError("Download was cancelled by user")

        status = d.get('status')
        progress_info = {
            "status": "downloading",
            "progress": 0.0,
            "speed": "0 KB/s",
            "eta": "Unknown"
        }

        if status == 'downloading':
            downloaded = d.get('downloaded_bytes', 0)
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            
            if total > 0:
                progress_info["progress"] = round((downloaded / total) * 100, 2)
            
            # Format speed
            speed = d.get('speed')
            if speed:
                if speed > 1024 * 1024:
                    progress_info["speed"] = f"{round(speed / (1024 * 1024), 2)} MB/s"
                else:
                    progress_info["speed"] = f"{round(speed / 1024, 2)} KB/s"
            
            # Format eta
            eta = d.get('eta')
            if eta:
                mins, secs = divmod(eta, 60)
                hours, mins = divmod(mins, 60)
                if hours > 0:
                    progress_info["eta"] = f"{hours:02d}:{mins:02d}:{secs:02d}"
                else:
                    progress_info["eta"] = f"{mins:02d}:{secs:02d}"

        elif status == 'finished':
            progress_info["status"] = "processing"
            progress_info["progress"] = 100.0

        # Save to Redis
        redis_client.setex(
            f"download:{download_id}",
            300, # Expire in 5 minutes
            json.dumps(progress_info)
        )
    return progress_hook

@celery.task(bind=True, name="app.workers.tasks.download_media_task")
def download_media_task(self, download_id: str):
    logger.info(f"Starting Celery task for download: {download_id}")
    db = SessionLocal()
    
    # Set task mapping in redis so API can revoke it
    redis_client.set(f"download:{download_id}:task_id", self.request.id)
    
    try:
        download_record = DownloadRepository.get_by_id(db, download_id)
        if not download_record:
            logger.error(f"Download record not found: {download_id}")
            return
        
        # Update db state to queued/downloading
        DownloadRepository.update(
            db, download_id,
            status="downloading",
            started_at=datetime.utcnow()
        )
        
        url = download_record.url
        media_type = download_record.media_type
        quality = download_record.quality
        
        # Check if cancelled before starting
        if redis_client.get(f"download:{download_id}:cancel"):
            raise CancelledError("Download was cancelled by user")

        if media_type == "thumbnail":
            # Fetch metadata first to get thumbnail url
            info = fetch_media_info(url)
            thumbnail_url = info.get("thumbnail")
            if not thumbnail_url:
                raise ValueError("No thumbnail found for this URL")
            
            # Download directly
            os.makedirs(settings.DOWNLOAD_DIR, exist_ok=True)
            file_path = os.path.join(settings.DOWNLOAD_DIR, f"{download_id}.jpg")
            
            urllib.request.urlretrieve(thumbnail_url, file_path)
            file_size = os.path.getsize(file_path)
            
            DownloadRepository.update(
                db, download_id,
                status="completed",
                title=info.get("title", "Thumbnail"),
                thumbnail_url=thumbnail_url,
                file_path=file_path,
                file_size=file_size,
                progress=100.0,
                completed_at=datetime.utcnow()
            )
            redis_client.delete(f"download:{download_id}")
            
        else: # video or audio
            # Fetch info to store title/thumbnail
            info = fetch_media_info(url)
            DownloadRepository.update(
                db, download_id,
                title=info.get("title"),
                thumbnail_url=info.get("thumbnail")
            )
            
            # Trigger yt-dlp download
            hook = create_progress_hook(download_id)
            file_path = download_media(
                url=url,
                media_type=media_type,
                quality=quality,
                output_dir=settings.DOWNLOAD_DIR,
                download_id=download_id,
                progress_hook_fn=hook
            )
            
            file_size = os.path.getsize(file_path)
            
            # Complete task
            DownloadRepository.update(
                db, download_id,
                status="completed",
                file_path=file_path,
                file_size=file_size,
                progress=100.0,
                completed_at=datetime.utcnow()
            )
            
            # Remove redis tracking key
            redis_client.delete(f"download:{download_id}")
            
        logger.info(f"Download task {download_id} completed successfully.")
        
    except CancelledError as e:
        logger.info(f"Download task {download_id} cancelled.")
        DownloadRepository.update(db, download_id, status="cancelled", error_message=str(e))
        redis_client.delete(f"download:{download_id}")
        # Clean files
        cleanup_files(download_id)
    except Exception as e:
        logger.error(f"Download task {download_id} failed: {str(e)}")
        DownloadRepository.update(db, download_id, status="failed", error_message=str(e))
        redis_client.delete(f"download:{download_id}")
        cleanup_files(download_id)
    finally:
        db.close()
        redis_client.delete(f"download:{download_id}:cancel")
        redis_client.delete(f"download:{download_id}:task_id")

def cleanup_files(download_id: str):
    try:
        # Scan download folder and remove matching files
        for f in os.listdir(settings.DOWNLOAD_DIR):
            if f.startswith(download_id):
                file_path = os.path.join(settings.DOWNLOAD_DIR, f)
                if os.path.exists(file_path):
                    os.remove(file_path)
    except Exception as e:
        logger.error(f"Error during cleanup for {download_id}: {str(e)}")
