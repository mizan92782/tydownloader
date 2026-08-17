from fastapi import APIRouter, Query, HTTPException
from app.schemas.media import MediaInfoResponse
from app.utils.yt_dlp_utils import fetch_media_info

router = APIRouter()

@router.get("/info", response_model=MediaInfoResponse)
def get_media_info(url: str = Query(..., description="The YouTube URL to fetch information for")):
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid URL format. URL must start with http:// or https://")
        
    try:
        info = fetch_media_info(url)
        return info
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
