import os
import re
from typing import Dict, Any, List, Optional
import yt_dlp
from app.core.logging import logger

def clean_url(url: str) -> str:
    # Basic URL sanitation
    return url.strip()

def fetch_media_info(url: str) -> Dict[str, Any]:
    url = clean_url(url)
    ydl_opts = {
        'skip_download': True,
        'extract_flat': False,
        'no_warnings': True,
        'quiet': True,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
            if not info:
                raise ValueError("Could not extract media info")
            
            # Extract heights for available qualities
            qualities = set()
            formats = info.get('formats', [])
            for f in formats:
                height = f.get('height')
                if height and isinstance(height, int) and height > 0:
                    qualities.add(height)
            
            # Filter and sort common resolutions
            common_resolutions = [360, 480, 720, 1080, 1440, 2160]
            available_qualities = sorted(list({q for q in qualities if q in common_resolutions}))
            if not available_qualities and qualities:
                available_qualities = sorted(list(qualities))[:6] # Return some if non-standard

            thumbnail = info.get('thumbnail') or (info.get('thumbnails')[-1]['url'] if info.get('thumbnails') else '')

            return {
                "id": info.get("id", ""),
                "title": info.get("title", "Unknown Title"),
                "channel": info.get("uploader", "Unknown Channel"),
                "duration": int(info.get("duration", 0)),
                "thumbnail": thumbnail,
                "available_qualities": available_qualities,
                "description": info.get("description", "")
            }
        except Exception as e:
            logger.error(f"Error extracting metadata from URL {url}: {str(e)}")
            raise ValueError(f"Failed to fetch media info: {str(e)}")

def download_media(
    url: str,
    media_type: str,
    quality: Optional[str],
    output_dir: str,
    download_id: str,
    progress_hook_fn
) -> str:
    """
    Downloads media and returns the absolute file path of the downloaded file.
    """
    url = clean_url(url)
    os.makedirs(output_dir, exist_ok=True)
    
    # Secure filename template
    outtmpl = os.path.join(output_dir, f"{download_id}.%(ext)s")
    
    ydl_opts = {
        'outtmpl': outtmpl,
        'progress_hooks': [progress_hook_fn] if progress_hook_fn else [],
        'no_warnings': True,
        'quiet': True,
    }
    
    if media_type == 'audio':
        ydl_opts.update({
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
        })
    elif media_type == 'thumbnail':
        # Handled separately in thumbnail service by downloading thumbnail image directly
        raise ValueError("Use thumbnail downloader service instead")
    else: # video
        # Determine format selection based on requested quality
        if not quality or quality == 'best':
            ydl_opts['format'] = 'bestvideo+bestaudio/best'
        else:
            try:
                height = int(quality)
                # Select best video up to height + best audio, or fallback
                ydl_opts['format'] = f'bestvideo[height<={height}]+bestaudio/best'
            except ValueError:
                ydl_opts['format'] = 'bestvideo+bestaudio/best'
        
        # Merge formats using ffmpeg
        ydl_opts['merge_output_format'] = 'mp4'

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        # yt-dlp might have written to multiple extensions or postprocessed.
        # Find the actual final file written.
        # Audio gets converted to .mp3, video merges to .mp4
        expected_ext = 'mp3' if media_type == 'audio' else 'mp4'
        final_path = os.path.join(output_dir, f"{download_id}.{expected_ext}")
        
        if os.path.exists(final_path):
            return final_path
            
        # Fallback search if yt-dlp named it otherwise
        for f in os.listdir(output_dir):
            if f.startswith(download_id):
                return os.path.join(output_dir, f)
                
        raise FileNotFoundError("Downloaded file could not be found")
