from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models.download import Download
from datetime import datetime

class DownloadRepository:
    @staticmethod
    def create(db: Session, url: str, media_type: str, quality: Optional[str] = None) -> Download:
        db_download = Download(
            url=url,
            media_type=media_type,
            quality=quality,
            status="pending"
        )
        db.add(db_download)
        db.commit()
        db.refresh(db_download)
        return db_download

    @staticmethod
    def get_by_id(db: Session, download_id: str) -> Optional[Download]:
        return db.query(Download).filter(Download.id == download_id).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[Download]:
        return db.query(Download).order_by(Download.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def update(db: Session, download_id: str, **kwargs) -> Optional[Download]:
        db_download = DownloadRepository.get_by_id(db, download_id)
        if db_download:
            for key, value in kwargs.items():
                if hasattr(db_download, key):
                    setattr(db_download, key, value)
            db.commit()
            db.refresh(db_download)
        return db_download
