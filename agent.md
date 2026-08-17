# YouTube Downloader — Full-Stack Flutter + FastAPI Application

You are a senior full-stack engineer specializing in **FastAPI, Python, Flutter/Dart, asynchronous systems, Docker, Redis, Celery, yt-dlp, and FFmpeg**.

Build a complete, production-quality **YouTube media downloader application** with:

* **Flutter** Android mobile frontend
* **FastAPI** backend
* **PostgreSQL** database
* **Redis** for caching/status management
* **Celery** for background download jobs
* **yt-dlp** for media extraction/download
* **FFmpeg** for audio extraction and video/audio merging
* **Docker + Docker Compose** for local development
* Clean architecture
* Proper error handling
* Download progress tracking
* Download history
* API documentation
* Unit/integration tests

The application should be designed so that it can later be deployed to a production Linux server.

---

# 1. Core Application Goal

The application allows a user to provide a supported YouTube URL and choose:

1. Video download
2. Audio/MP3 download
3. Thumbnail/image download

For video downloads, the user should be able to select:

* 360p
* 480p
* 720p
* 1080p
* 1440p
* Best available

The backend performs the actual media processing.

The Flutter application communicates only with the FastAPI API.

Do NOT execute Ubuntu Bash scripts from Flutter.

The existing Bash logic should be migrated into reusable Python services.

---

# 2. Overall Architecture

Use this architecture:

Flutter Mobile App
|
| HTTPS REST API
↓
FastAPI Backend
|
├── PostgreSQL
|
├── Redis
|
└── Celery
|
↓
Download Worker
|
├── yt-dlp
└── FFmpeg
|
↓
File Storage

Use asynchronous/background processing so that a large download never blocks the FastAPI request.

---

# 3. Backend Technology

Use:

* Python 3.12+
* FastAPI
* Pydantic v2
* SQLAlchemy 2.x
* PostgreSQL
* Alembic
* Redis
* Celery
* yt-dlp
* FFmpeg
* Uvicorn
* Gunicorn
* Docker
* Docker Compose

Use environment variables for configuration.

Never hardcode:

* database credentials
* Redis URL
* secret keys
* storage paths
* API configuration

---

# 4. Backend Project Structure

Create a clean structure similar to:

backend/

```
app/
    main.py

    core/
        config.py
        logging.py
        security.py

    db/
        database.py
        models/
        repositories/

    api/
        routes/
            health.py
            media.py
            downloads.py

    schemas/
        media.py
        download.py
        common.py

    services/
        media_service.py
        download_service.py
        thumbnail_service.py
        storage_service.py

    workers/
        celery_app.py
        tasks.py

    utils/
        yt_dlp_utils.py
        ffmpeg_utils.py

alembic/

tests/

Dockerfile
docker-compose.yml
requirements.txt
.env.example
```

Keep business logic out of API route files.

---

# 5. Database Design

Use PostgreSQL.

Create a Download model containing at least:

* id
* url
* media_type
* title
* thumbnail_url
* quality
* status
* progress
* file_path
* file_size
* error_message
* created_at
* started_at
* completed_at

Status values:

* pending
* queued
* downloading
* processing
* completed
* failed
* cancelled

Media types:

* video
* audio
* thumbnail

Use proper PostgreSQL indexes where useful.

Use UUIDs for public download IDs.

Do not expose internal database IDs unnecessarily.

Create Alembic migrations.

---

# 6. Media Information API

Before downloading, the Flutter application should be able to request information about a YouTube URL.

Endpoint:

GET /api/v1/media/info

or POST if necessary.

The backend should use yt-dlp to retrieve metadata.

Return:

* video ID
* title
* description if available
* uploader/channel
* duration
* thumbnail
* available resolutions
* available formats
* estimated file sizes when available

Example response:

{
"id": "...",
"title": "...",
"duration": 245,
"thumbnail": "...",
"available_qualities": [
360,
480,
720,
1080,
1440
]
}

Do not download the media during this request.

---

# 7. Download API

Create:

POST /api/v1/downloads

Request:

{
"url": "...",
"type": "video",
"quality": 1080
}

For audio:

{
"url": "...",
"type": "audio"
}

For thumbnail:

{
"url": "...",
"type": "thumbnail"
}

The API should:

1. Validate URL.
2. Validate requested media type.
3. Validate quality.
4. Create database record.
5. Queue Celery task.
6. Immediately return a download ID.

Example:

{
"download_id": "uuid",
"status": "queued"
}

Do not perform the actual download inside the HTTP request.

---

# 8. Celery Background Processing

Create Celery workers.

The download flow should be:

API
↓
Create Download record
↓
Celery queue
↓
Worker
↓
yt-dlp
↓
FFmpeg if required
↓
Update progress
↓
Save result
↓
Update database
↓
Flutter receives completed status

The worker must handle:

* download errors
* FFmpeg errors
* yt-dlp errors
* network failures
* invalid URLs
* unavailable formats
* cancellation
* unexpected exceptions

Never let a worker crash the entire queue.

---

# 9. yt-dlp Integration

Create a dedicated service class.

Example concept:

YouTubeDownloader

Responsibilities:

* extract metadata
* determine available formats
* download video
* download audio
* download thumbnail
* report progress
* handle yt-dlp errors

For video:

Use the equivalent of:

best video stream up to requested resolution
+
best audio stream

Then merge using FFmpeg.

For example, for 1080p:

bestvideo[height<=1080]+bestaudio/best

For best:

bestvideo+bestaudio/best

For audio:

bestaudio/best

Then:

-x
--audio-format mp3

Use safe output templates.

Do not trust user-provided filenames.

Sanitize filenames.

---

# 10. FFmpeg

The backend must verify FFmpeg exists.

At application startup or health check, detect whether:

ffmpeg
ffprobe

are available.

Provide a clear error if they are missing.

Use FFmpeg for:

* merging video + audio
* converting audio to MP3
* required media processing

Do not manually implement media conversion.

---

# 11. Progress Tracking

This is important.

yt-dlp should provide download progress.

Capture:

* percentage
* downloaded bytes
* total bytes
* speed
* ETA
* current status

Store/update progress in Redis and PostgreSQL appropriately.

Avoid writing to PostgreSQL on every tiny progress update.

Use Redis for high-frequency progress updates.

Example Redis state:

download:{download_id}

{
"status": "downloading",
"progress": 72,
"speed": "8.4 MB/s",
"eta": "00:12"
}

Persist important state transitions in PostgreSQL.

---

# 12. Download Status API

Create:

GET /api/v1/downloads/{download_id}

Return:

{
"id": "...",
"status": "downloading",
"progress": 72,
"speed": "8.4 MB/s",
"eta": "12 seconds",
"title": "...",
"file_size": 123456789
}

Flutter will poll this endpoint initially.

Design the backend so WebSocket/SSE can be added later.

---

# 13. Cancel Download

Create:

POST /api/v1/downloads/{download_id}/cancel

The system should:

1. Mark the task as cancelled.
2. Stop the Celery task/process safely.
3. Clean temporary files.
4. Update database status.

Avoid leaving partially downloaded files.

---

# 14. Download File

Create:

GET /api/v1/downloads/{download_id}/file

Only allow downloading files belonging to completed downloads.

Use streaming responses.

Do not load a large video entirely into RAM.

Support appropriate:

* Content-Type
* Content-Disposition
* Content-Length

---

# 15. Thumbnail Download

Allow:

POST /api/v1/downloads

with:

"type": "thumbnail"

The backend should retrieve the best available thumbnail URL and download it.

Return JPG/WEBP/PNG as appropriate.

---

# 16. Security

Implement:

* URL validation
* request validation
* rate limiting
* maximum concurrent downloads
* maximum file size configuration
* safe filename generation
* path traversal protection
* temporary file cleanup
* CORS configuration
* structured logging

Do not allow arbitrary shell commands from API requests.

Never execute:

user input directly through shell=True.

Use subprocess safely where necessary.

---

# 17. API Documentation

FastAPI should expose:

/docs
/redoc

Use proper:

* request schemas
* response schemas
* status codes
* API descriptions
* examples

Version the API:

/api/v1/...

---

# 18. Flutter Application

Build a modern Android Flutter application.

Use:

* Flutter latest stable
* Dart latest stable
* Material 3
* Riverpod or Bloc for state management
* Dio for HTTP
* GoRouter for navigation

Use a clean architecture.

Recommended structure:

lib/

```
main.dart

core/
    constants/
    theme/
    network/
    utils/

models/
    media_info.dart
    download.dart

services/
    api_service.dart

repositories/
    download_repository.dart

providers/
    download_provider.dart

screens/
    home/
    downloads/
    settings/

widgets/
    url_input.dart
    quality_selector.dart
    download_card.dart
    progress_indicator.dart
```

---

# 19. Flutter Home Screen

Create a professional UI.

Home screen should contain:

* App title/logo
* YouTube URL input
* Paste button
* Fetch information button
* media preview
* title
* thumbnail
* duration
* media type selector
* quality selector
* download button

Example:

YouTube Downloader

[ Paste YouTube URL ]

[ Get Information ]

---

Thumbnail

Video title

Duration: 04:25

Type:
[ Video ] [ Audio ] [ Image ]

Quality:
[ 1080p ▼ ]

[ Download ]

---

# 20. URL Handling

Add a paste button.

If clipboard contains a URL, allow the user to paste it easily.

Validate obvious invalid input before calling backend.

Show user-friendly errors.

Example:

"Please enter a valid YouTube URL."

---

# 21. Media Preview

After fetching information, display:

* thumbnail
* title
* channel
* duration
* available quality

Example:

┌─────────────────────────┐
│                         │
│       Thumbnail         │
│                         │
└─────────────────────────┘

Channel 24

University Dropout...

04:35

Quality:
[1080p ▼]

---

# 22. Download Progress UI

When downloading:

Show:

Title

1080p

Downloading...

██████████████░░░░ 72%

72%

8.4 MB/s

ETA 00:12

[ Cancel ]

When completed:

✓ Download completed

[ Open File ]

---

# 23. Downloads Screen

Create a Downloads/History screen.

Display:

* title
* thumbnail
* media type
* quality
* status
* date
* file size

Statuses:

Queued
Downloading
Completed
Failed
Cancelled

Example:

Downloads

──────────────────

🎥 Video Title
1080p
✓ Completed

──────────────────

🎵 Song Title
MP3
✓ Completed

──────────────────

Video Title
720p
Downloading 65%

---

# 24. Local File Handling

After a download completes, the user should be able to access the downloaded file.

Handle Android storage correctly.

Do not request unnecessary permissions.

Use modern Android storage APIs where possible.

The backend should return the file/download URL.

Flutter should download the resulting file into an appropriate user-accessible location.

---

# 25. Backend URL Configuration

Flutter must NOT hardcode production URLs throughout the code.

Create environment/configuration support.

Development:

http://10.0.2.2:8000

for Android emulator.

Production:

https://your-domain.com

Create a single API configuration.

---

# 26. Error Handling

Backend errors must be converted into understandable Flutter messages.

Examples:

Invalid URL

"Please enter a valid YouTube URL."

Format unavailable

"The selected quality is not available for this video."

Network error

"Unable to connect to the server."

Download failed

"Download failed. Please try again."

Server busy

"Too many downloads are currently running."

Never show raw Python stack traces to users.

---

# 27. Docker

Create Docker Compose with:

services:

* api
* worker
* postgres
* redis

Example architecture:

docker-compose.yml

api:
FastAPI

worker:
Celery

postgres:
PostgreSQL

redis:
Redis

FFmpeg and yt-dlp must be installed inside the API/worker image.

Use a shared volume for downloaded files.

Do not store large media files inside the PostgreSQL database.

---

# 28. Environment Variables

Create:

.env.example

Include:

DATABASE_URL=
REDIS_URL=
SECRET_KEY=
DOWNLOAD_DIR=
MAX_FILE_SIZE=
MAX_CONCURRENT_DOWNLOADS=
CORS_ORIGINS=
API_HOST=
API_PORT=

Never commit .env.

Add .env to .gitignore.

---

# 29. Logging

Implement structured logging.

Log:

* request ID
* download ID
* URL domain
* task status
* processing time
* errors

Do not log sensitive information unnecessarily.

---

# 30. Testing

Create backend tests for:

* health endpoint
* URL validation
* media info
* download creation
* status endpoint
* cancellation
* invalid quality
* invalid URL
* authentication if implemented
* repository logic
* service logic

Flutter tests:

* URL validation
* quality selection
* API parsing
* download state changes
* error states

Mock actual YouTube downloads in automated tests.

Do NOT run real large YouTube downloads during normal test execution.

---

# 31. Code Quality

Follow:

* PEP8
* type hints
* async FastAPI patterns where appropriate
* SOLID principles
* separation of concerns
* dependency injection
* reusable services
* clear naming
* meaningful comments only where necessary

Do not create unnecessarily complicated abstractions.

Prefer simple maintainable code.

---

# 32. Important Development Rule

Before writing large amounts of code:

1. Analyze the requirements.
2. Create the complete architecture.
3. Create the project structure.
4. Implement backend foundation.
5. Implement database.
6. Implement yt-dlp/FFmpeg services.
7. Implement Celery.
8. Implement APIs.
9. Test backend.
10. Implement Flutter networking.
11. Implement Flutter screens.
12. Implement download progress.
13. Implement local file handling.
14. Test Flutter.
15. Create Docker configuration.
16. Create documentation.

Do not skip steps.

After each major stage, run tests and fix errors before continuing.

---

# 33. Do Not Fake Functionality

Do NOT create fake:

* download progress
* download results
* video metadata
* file URLs
* completed states

The application must use the actual backend and actual yt-dlp/FFmpeg processing.

If something cannot be implemented immediately, clearly mark it as TODO instead of pretending it works.

---

# 34. Final Deliverables

At the end, provide:

1. Complete FastAPI backend
2. Complete Flutter Android application
3. PostgreSQL models
4. Alembic migrations
5. Redis integration
6. Celery workers
7. yt-dlp integration
8. FFmpeg integration
9. Dockerfile
10. docker-compose.yml
11. .env.example
12. README.md
13. API documentation
14. Backend tests
15. Flutter tests
16. Android build instructions
17. Local development instructions
18. Production deployment instructions

---

# 35. README Must Explain

Include exact commands for:

Backend:

```bash
docker compose up --build
```

Database migrations:

```bash
alembic upgrade head
```

Flutter:

```bash
flutter pub get
flutter run
```

Android APK:

```bash
flutter build apk --release
```

Explain how to configure:

* API URL
* PostgreSQL
* Redis
* FFmpeg
* yt-dlp
* storage
* Android permissions
* development environment

---

# 36. Legal/Platform Considerations

The application should be designed for downloading content that the user has permission to download and should not intentionally bypass DRM, access controls, or other technical restrictions.

Do not implement DRM circumvention.

Do not implement authentication-cookie theft or mechanisms intended to bypass access controls.

Provide a clear notice in the application that users are responsible for complying with applicable copyright law and the terms of the media platform.

---

# 37. Final Acceptance Criteria

The project is considered complete only when this workflow works end-to-end:

1. Open Flutter app.
2. Paste a supported YouTube URL.
3. Press "Get Information".
4. Backend returns actual metadata.
5. Flutter displays thumbnail/title/duration.
6. User selects Video/Audio/Thumbnail.
7. User selects video quality.
8. User presses Download.
9. FastAPI creates a download job.
10. Celery processes the job.
11. yt-dlp downloads the media.
12. FFmpeg processes/merges media when necessary.
13. Redis tracks progress.
14. Flutter displays real progress.
15. Download completes.
16. Flutter displays completed status.
17. User can access the downloaded file.
18. Failed downloads show useful errors.
19. Cancelled downloads are cleaned up.
20. Download history remains available.

Do not stop after creating the UI. Build and test the complete end-to-end system.

Start by inspecting the current project/workspace, then provide the implementation plan and begin implementing the project.
