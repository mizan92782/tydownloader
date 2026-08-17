from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.db.database import engine, Base
from app.api.routes import health, media, downloads
from app.utils.ffmpeg_utils import verify_ffmpeg

# Setup structured logging
setup_logging()

# Initialize FastAPI App
app = FastAPI(
    title="YouTube Media Downloader API",
    description="Backend API for downloading YouTube videos, audio, and thumbnails using yt-dlp & FFmpeg",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(media.router, prefix="/api/v1/media", tags=["Media Information"])
app.include_router(downloads.router, prefix="/api/v1/downloads", tags=["Downloads"])

@app.on_event("startup")
def startup_event():
    logger.info("Initializing database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")

    logger.info("Checking FFmpeg dependency...")
    if verify_ffmpeg():
        logger.info("FFmpeg and FFprobe verified successfully.")
    else:
        logger.warning("FFmpeg/FFprobe are missing. Some backend download processes may fail.")
