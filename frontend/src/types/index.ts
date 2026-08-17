export type MediaType = 'video' | 'audio' | 'thumbnail'
export type DownloadStatus =
  | 'pending'
  | 'queued'
  | 'downloading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface MediaInfo {
  id: string
  title: string
  description?: string
  uploader?: string
  channel?: string
  duration: number
  thumbnail: string
  available_qualities: number[]
  available_formats?: string[]
}

export interface DownloadRecord {
  id: string
  url: string
  media_type: MediaType
  title: string
  thumbnail_url?: string
  quality?: number
  status: DownloadStatus
  progress: number
  file_size?: number
  error_message?: string
  created_at: string
  started_at?: string
  completed_at?: string
  speed?: string
  eta?: string
}

export interface CreateDownloadRequest {
  url: string
  type: MediaType
  quality?: number
}

export interface CreateDownloadResponse {
  download_id: string
  status: DownloadStatus
}

export interface DownloadProgressResponse {
  id: string
  status: DownloadStatus
  progress: number
  speed?: string
  eta?: string
  title?: string
  file_size?: number
  error_message?: string
}
