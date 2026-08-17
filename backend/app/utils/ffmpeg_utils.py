import shutil
from app.core.logging import logger

def verify_ffmpeg() -> bool:
    """
    Verify that ffmpeg and ffprobe are installed and available in the system path.
    """
    ffmpeg_path = shutil.which("ffmpeg")
    ffprobe_path = shutil.which("ffprobe")

    if not ffmpeg_path:
        logger.error("FFmpeg not found in system PATH.")
    if not ffprobe_path:
        logger.error("FFprobe not found in system PATH.")

    return bool(ffmpeg_path and ffprobe_path)
