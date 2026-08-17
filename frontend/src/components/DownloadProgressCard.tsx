import { useEffect, useRef } from 'react'
import { X, Download } from 'lucide-react'
import type { DownloadRecord } from '../types'
import { getDownloadFileUrl } from '../services/api'
import styles from './DownloadProgressCard.module.css'

interface DownloadProgressCardProps {
  download: DownloadRecord
  onCancel: (id: string) => void
  onDismiss: (id: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#94a3b8',
  queued: '#6366f1',
  downloading: '#3b82f6',
  processing: '#8b5cf6',
  completed: '#10b981',
  failed: '#ef4444',
  cancelled: '#64748b',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  queued: 'Queued',
  downloading: 'Downloading',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

export default function DownloadProgressCard({
  download,
  onCancel,
  onDismiss,
}: DownloadProgressCardProps) {
  const progressRef = useRef<HTMLDivElement>(null)
  const isActive = ['pending', 'queued', 'downloading', 'processing'].includes(download.status)
  const isCompleted = download.status === 'completed'
  const isFailed = download.status === 'failed'
  const isCancelled = download.status === 'cancelled'
  const isDone = isCompleted || isFailed || isCancelled

  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.width = `${download.progress}%`
    }
  }, [download.progress])

  const formatBytes = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const statusColor = STATUS_COLORS[download.status] || '#94a3b8'
  const statusLabel = STATUS_LABELS[download.status] || download.status

  return (
    <div
      className={`${styles.card} ${isDone ? styles.cardDone : ''}`}
      id={`download-card-${download.id}`}
      role="article"
      aria-label={`Download: ${download.title}`}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.mediaTypeIcon}>
            {download.media_type === 'video' ? '🎬' : download.media_type === 'audio' ? '🎵' : '🖼️'}
          </span>
          <div className={styles.titleInfo}>
            <h3 className={styles.title}>{download.title || 'Untitled'}</h3>
            <div className={styles.badges}>
              <span
                className={styles.statusBadge}
                style={{ color: statusColor, borderColor: `${statusColor}40`, background: `${statusColor}15` }}
              >
                <span
                  className={`${styles.statusDot} ${isActive ? styles.statusDotPulse : ''}`}
                  style={{ background: statusColor }}
                />
                {statusLabel}
              </span>
              {download.quality && download.media_type === 'video' && (
                <span className={styles.qualityBadge}>{download.quality}p</span>
              )}
              {download.media_type === 'audio' && (
                <span className={styles.qualityBadge}>MP3</span>
              )}
            </div>
          </div>
        </div>
        <button
          className={styles.closeButton}
          onClick={() => onDismiss(download.id)}
          aria-label="Dismiss"
          id={`dismiss-${download.id}`}
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress Bar */}
      {!isDone || download.status === 'downloading' ? (
        <div className={styles.progressContainer}>
          <div className={styles.progressTrack}>
            <div
              ref={progressRef}
              className={`${styles.progressBar} ${isActive ? styles.progressBarAnimated : ''}`}
              style={{ background: `linear-gradient(90deg, ${statusColor}, ${statusColor}cc)` }}
            />
          </div>
          <div className={styles.progressStats}>
            <span className={styles.progressPercent}>{Math.round(download.progress)}%</span>
            <div className={styles.progressDetails}>
              {download.speed && <span>{download.speed}</span>}
              {download.eta && <span>ETA {download.eta}</span>}
              {download.file_size && <span>{formatBytes(download.file_size)}</span>}
            </div>
          </div>
        </div>
      ) : null}

      {/* Completed state */}
      {isCompleted && (
        <div className={styles.completedRow}>
          <div className={styles.completedInfo}>
            <span className={styles.completedIcon}>✓</span>
            <span className={styles.completedText}>Download complete</span>
            {download.file_size && (
              <span className={styles.fileSize}>{formatBytes(download.file_size)}</span>
            )}
          </div>
          <a
            href={getDownloadFileUrl(download.id)}
            download
            className={styles.openButton}
            id={`open-file-${download.id}`}
          >
            <Download size={15} />
            Save File
          </a>
        </div>
      )}

      {/* Failed state */}
      {isFailed && (
        <div className={styles.errorRow}>
          <span>⚠ {download.error_message || 'Download failed. Please try again.'}</span>
        </div>
      )}

      {/* Actions */}
      {isActive && (
        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={() => onCancel(download.id)}
            id={`cancel-download-${download.id}`}
            type="button"
          >
            <X size={14} />
            Cancel Download
          </button>
        </div>
      )}
    </div>
  )
}
