import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Download, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { listDownloads, cancelDownload, getDownloadFileUrl } from '../services/api'
import type { DownloadRecord, DownloadStatus } from '../types'
import styles from './DownloadsPage.module.css'

const STATUS_COLORS: Record<DownloadStatus, string> = {
  pending: '#94a3b8',
  queued: '#6366f1',
  downloading: '#3b82f6',
  processing: '#8b5cf6',
  completed: '#10b981',
  failed: '#ef4444',
  cancelled: '#64748b',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBytes(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function DownloadsPage() {
  const navigate = useNavigate()
  const [downloads, setDownloads] = useState<DownloadRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<DownloadStatus | 'all'>('all')

  const loadDownloads = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await listDownloads()
      setDownloads(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load downloads'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDownloads()
  }, [])

  const handleCancel = async (id: string) => {
    try {
      await cancelDownload(id)
      setDownloads((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'cancelled' as DownloadStatus } : d))
      )
      toast('Download cancelled', { icon: '🚫' })
    } catch {
      toast.error('Failed to cancel download')
    }
  }

  const FILTER_OPTIONS: Array<{ value: DownloadStatus | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'downloading', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  const filtered = filter === 'all' ? downloads : downloads.filter((d) => d.status === filter)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Download History</h1>
          <p className={styles.subtitle}>{downloads.length} total downloads</p>
        </div>
        <button
          className={styles.refreshButton}
          onClick={loadDownloads}
          disabled={isLoading}
          id="btn-refresh-downloads"
          type="button"
        >
          <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className={styles.filterBar} role="tablist">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            id={`filter-${opt.value}`}
            className={`${styles.filterTab} ${filter === opt.value ? styles.filterTabActive : ''}`}
            onClick={() => setFilter(opt.value)}
            role="tab"
            aria-selected={filter === opt.value}
            type="button"
          >
            {opt.label}
            <span className={styles.filterCount}>
              {opt.value === 'all'
                ? downloads.length
                : downloads.filter((d) => d.status === opt.value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <p>Loading downloads...</p>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <p>⚠ {error}</p>
          <button className={styles.retryButton} onClick={loadDownloads} type="button">
            Try Again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <h2>No downloads yet</h2>
          <p>Go to the home page to download a YouTube video.</p>
          <button
            className={styles.goHomeButton}
            onClick={() => navigate('/')}
            id="btn-go-home"
            type="button"
          >
            Start Downloading
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((d) => (
            <div key={d.id} className={styles.card} id={`history-${d.id}`}>
              {d.thumbnail_url && (
                <img
                  src={d.thumbnail_url}
                  alt={d.title}
                  className={styles.cardThumbnail}
                  loading="lazy"
                />
              )}
              <div className={styles.cardBody}>
                <div className={styles.cardHeader}>
                  <span className={styles.mediaIcon}>
                    {d.media_type === 'video' ? '🎬' : d.media_type === 'audio' ? '🎵' : '🖼️'}
                  </span>
                  <h3 className={styles.cardTitle}>{d.title || 'Untitled'}</h3>
                </div>
                <div className={styles.cardMeta}>
                  <span
                    className={styles.statusPill}
                    style={{
                      color: STATUS_COLORS[d.status],
                      background: `${STATUS_COLORS[d.status]}18`,
                      borderColor: `${STATUS_COLORS[d.status]}40`,
                    }}
                  >
                    {d.status}
                  </span>
                  {d.quality && d.media_type === 'video' && (
                    <span className={styles.metaBadge}>{d.quality}p</span>
                  )}
                  {d.media_type === 'audio' && (
                    <span className={styles.metaBadge}>MP3</span>
                  )}
                  <span className={styles.metaText}>{formatBytes(d.file_size)}</span>
                  <span className={styles.metaText}>{formatDate(d.created_at)}</span>
                </div>

                {/* Progress bar for active */}
                {['downloading', 'processing'].includes(d.status) && (
                  <div className={styles.miniProgress}>
                    <div
                      className={styles.miniProgressBar}
                      style={{ width: `${d.progress}%` }}
                    />
                    <span className={styles.miniProgressText}>{Math.round(d.progress)}%</span>
                  </div>
                )}
              </div>

              <div className={styles.cardActions}>
                {d.status === 'completed' && (
                  <a
                    href={getDownloadFileUrl(d.id)}
                    download
                    className={styles.downloadBtn}
                    id={`dl-file-${d.id}`}
                  >
                    <Download size={14} />
                  </a>
                )}
                {['pending', 'queued', 'downloading'].includes(d.status) && (
                  <button
                    className={styles.cancelBtn}
                    onClick={() => handleCancel(d.id)}
                    id={`cancel-${d.id}`}
                    type="button"
                    aria-label="Cancel download"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
