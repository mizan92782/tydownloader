import axios from 'axios'
import type {
  MediaInfo,
  DownloadRecord,
  CreateDownloadRequest,
  CreateDownloadResponse,
  DownloadProgressResponse,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Request interceptor for logging
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
)

// Response interceptor for error normalization
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  }
)

// ─── Media Info ───────────────────────────────────────────────────────────────
export const fetchMediaInfo = async (url: string): Promise<MediaInfo> => {
  const { data } = await api.get<MediaInfo>('/media/info', { params: { url } })
  return data
}

// ─── Downloads ────────────────────────────────────────────────────────────────
export const createDownload = async (
  payload: CreateDownloadRequest
): Promise<CreateDownloadResponse> => {
  const { data } = await api.post<CreateDownloadResponse>('/downloads', payload)
  return data
}

export const getDownloadProgress = async (
  id: string
): Promise<DownloadProgressResponse> => {
  const { data } = await api.get<DownloadProgressResponse>(`/downloads/${id}`)
  return data
}

export const listDownloads = async (): Promise<DownloadRecord[]> => {
  const { data } = await api.get<DownloadRecord[]>('/downloads')
  return data
}

export const cancelDownload = async (id: string): Promise<void> => {
  await api.post(`/downloads/${id}/cancel`)
}

export const getDownloadFileUrl = (id: string): string =>
  `${API_BASE_URL}/api/v1/downloads/${id}/file`

// ─── Health ───────────────────────────────────────────────────────────────────
export const checkHealth = async (): Promise<{ status: string }> => {
  const { data } = await api.get('/health')
  return data
}

export default api
