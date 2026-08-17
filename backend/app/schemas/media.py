from pydantic import BaseModel, HttpUrl
from typing import List, Optional

class MediaInfoRequest(BaseModel):
    url: str

class MediaInfoResponse(BaseModel):
    id: str
    title: str
    channel: str
    duration: int # in seconds
    thumbnail: str
    available_qualities: List[int]
    description: Optional[str] = None
