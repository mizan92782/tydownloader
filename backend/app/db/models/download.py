import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, BigInteger, DateTime, Text
from app.db.database import Base

class Download(Base):
    __tablename__ = "downloads"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    url = Column(String(2048), nullable=False)
    media_type = Column(String(50), nullable=False) # video, audio, thumbnail
    title = Column(String(512), nullable=True)
    thumbnail_url = Column(String(2048), nullable=True)
    quality = Column(String(50), nullable=True)
    status = Column(String(50), default="pending", nullable=False) # pending, queued, downloading, processing, completed, failed, cancelled
    progress = Column(Float, default=0.0, nullable=False)
    file_path = Column(String(1024), nullable=True)
    file_size = Column(BigInteger, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
