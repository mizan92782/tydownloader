import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getDownloadProgress, cancelDownload, getDownloadFileUrl } from '../services/api'
import type { DownloadProgressResponse, DownloadStatus } from '../types'
import styles from './DownloadDetailPage.module.css'

const STATUS_COLORS: Record<DownloadStatus, string> = {
  pending: '#94a3b8',
  queued: '#6366f1',
  downloading: '#3b82f6',
  processing: '#8b5cf6',
  completed: '#10b981',
  failed: '#ef4444',
  cancelled: '#64748b',
}

const POLL_INTERVAL = 2000

export default function DownloadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<DownloadProgressResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current)
      pollerRef.current = null
    }
  }

  useEffect(() => {
    if (!id) return

    const load = async () => {
      try {
        const progress = await getDownloadProgress(id)
        setData(progress)
        if (['completed', 'failed', 'cancelled'].includes(progress.status)) {
          stopPolling()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load download')
        stopPolling()
      }
    }

    load()
    pollerRef.current = setInterval(load, POLL_INTERVAL)

    return () => stopPolling()
  }, [id])

  const handleCancel = async () => {
    if (!id) return
    try {
      await cancelDownload(id)
      setData((prev) => prev ? { ...prev, status: 'cancelled' } : prev)
      stopPolling()
      toast('Download cancelled', { icon: '🚫' })
    } catch {
      toast.error('Failed to cancel')
    }
  }

  if (error) {
    return (
      <div className={styles.center}>
        <p className={styles.errorText}>⚠ {error}</p>
        <button className={styles.backButton} onClick={() => navigate('/downloads')} type="button">
          <ArrowLeft size={16} /> Back to Downloads
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p>Loading download details...</p>
      </div>
    )
  }

  const isActive = ['pending', 'queued', 'downloading', 'processing'].includes(data.status)
  const isCompleted = data.status === 'completed'
  const statusColor = STATUS_COLORS[data.status] || '#94a3b8'

  return (
    <div className={styles.page}>
      <button
        className={styles.backButton}
        onClick={() => navigate(-1)}
        type="button"
        id="btn-back"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h1 className={styles.title} id="detail-title">
            {data.title || 'Download'}
          </h1>
          <span
            className={styles.statusBadge}
            style={{
              color: statusColor,
              background: `${statusColor}18`,
              borderColor: `${statusColor}40`,
            }}
          >
            <span
              className={`${styles.statusDot} ${isActive ? styles.statusDotPulse : ''}`}
              style={{ background: statusColor }}
            />
            {data.status}
          </span>
        </div>

        {/* Large progress */}
        <div className={styles.progressSection}>
          <div className={styles.progressRing}>
            <svg viewBox="0 0 120 120" className={styles.svg}>
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="8"
              />
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke={statusColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - data.progress / 100)}`}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className={styles.progressCenter}>
              <span className={styles.progressValue}>{Math.round(data.progress)}%</span>
            </div>
          </div>

          <div className={styles.stats}>
            {data.speed && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Speed</span>
                <span className={styles.statValue}>{data.speed}</span>
              </div>
            )}
            {data.eta && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>ETA</span>
                <span className={styles.statValue}>{data.eta}</span>
              </div>
            )}
            {data.file_size && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Size</span>
                <span className={styles.statValue}>
                  {(data.file_size / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
            )}
            <div className={styles.stat}>
              <span className={styles.statLabel}>ID</span>
              <span className={styles.statValue} style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>
                {id?.slice(0, 8)}...
              </span>
            </div>
          </div>
        </div>

        {isCompleted && (
          <a
            href={getDownloadFileUrl(id!)}
            download
            className={styles.downloadFileButton}
            id="btn-download-file"
          >
            <Download size={18} />
            Download File
          </a>
        )}

        {data.error_message && (
          <div className={styles.errorBox}>
            <strong>Error:</strong> {data.error_message}
          </div>
        )}

        {isActive && (
          <button
            className={styles.cancelButton}
            onClick={handleCancel}
            id="btn-cancel-detail"
            type="button"
          >
            <X size={16} />
            Cancel Download
          </button>
        )}
      </div>
    </div>
  )
}
