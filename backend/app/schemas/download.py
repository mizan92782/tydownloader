from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class DownloadRequest(BaseModel):
    url: str
    type: str # video, audio, thumbnail
    quality: Optional[str] = None # e.g. 1080, 720, best

class DownloadResponse(BaseModel):
    download_id: str
    status: str

class DownloadStatusResponse(BaseModel):
    id: str
    url: str
    media_type: str
    title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    quality: Optional[str] = None
    status: str
    progress: float
    file_size: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    speed: Optional[str] = None
    eta: Optional[str] = None

    class Config:
        from_attributes = True
