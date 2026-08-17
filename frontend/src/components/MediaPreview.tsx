import { useState } from 'react'
import { Clock, User, ExternalLink } from 'lucide-react'
import type { MediaInfo, MediaType } from '../types'
import styles from './MediaPreview.module.css'

interface MediaPreviewProps {
  info: MediaInfo
  selectedType: MediaType
  selectedQuality: number | null
  onTypeChange: (type: MediaType) => void
  onQualityChange: (quality: number | null) => void
  onDownload: () => void
  isDownloading: boolean
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

const MEDIA_TYPES: { value: MediaType; label: string; icon: string }[] = [
  { value: 'video', label: 'Video', icon: '🎬' },
  { value: 'audio', label: 'Audio MP3', icon: '🎵' },
  { value: 'thumbnail', label: 'Thumbnail', icon: '🖼️' },
]

export default function MediaPreview({
  info,
  selectedType,
  selectedQuality,
  onTypeChange,
  onQualityChange,
  onDownload,
  isDownloading,
}: MediaPreviewProps) {
  const [imgError, setImgError] = useState(false)

  const sortedQualities = [...info.available_qualities].sort((a, b) => b - a)
  const bestQuality = sortedQualities[0] ?? null

  const displayQuality = selectedQuality ?? bestQuality

  return (
    <div className={styles.card}>
      {/* Thumbnail */}
      <div className={styles.thumbnailWrapper}>
        {!imgError ? (
          <img
            src={info.thumbnail}
            alt={info.title}
            className={styles.thumbnail}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.thumbnailFallback}>
            <span>🎬</span>
          </div>
        )}
        <div className={styles.durationBadge}>{formatDuration(info.duration)}</div>
      </div>

      {/* Info */}
      <div className={styles.info}>
        <h2 className={styles.title} id="media-title">{info.title}</h2>
        <div className={styles.meta}>
          {(info.uploader || info.channel) && (
            <span className={styles.metaItem}>
              <User size={13} />
              {info.uploader || info.channel}
            </span>
          )}
          <span className={styles.metaItem}>
            <Clock size={13} />
            {formatDuration(info.duration)}
          </span>
          <a
            href={`https://youtube.com/watch?v=${info.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.metaLink}
          >
            <ExternalLink size={13} />
            YouTube
          </a>
        </div>

        {/* Type selector */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Media Type</label>
          <div className={styles.typeSelector} role="group" aria-label="Media type">
            {MEDIA_TYPES.map((t) => (
              <button
                key={t.value}
                id={`type-${t.value}`}
                className={`${styles.typeButton} ${selectedType === t.value ? styles.typeButtonActive : ''}`}
                onClick={() => onTypeChange(t.value)}
                type="button"
                aria-pressed={selectedType === t.value}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quality selector - only for video */}
        {selectedType === 'video' && sortedQualities.length > 0 && (
          <div className={styles.section}>
            <label className={styles.sectionLabel} htmlFor="quality-select">
              Quality
            </label>
            <div className={styles.qualityGrid} role="group" aria-label="Video quality">
              {sortedQualities.map((q) => (
                <button
                  key={q}
                  id={`quality-${q}`}
                  className={`${styles.qualityButton} ${displayQuality === q ? styles.qualityButtonActive : ''}`}
                  onClick={() => onQualityChange(q)}
                  type="button"
                  aria-pressed={displayQuality === q}
                >
                  {q}p
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Download button */}
        <button
          id="btn-download"
          className={styles.downloadButton}
          onClick={onDownload}
          disabled={isDownloading}
          type="button"
        >
          {isDownloading ? (
            <span className={styles.downloadingText}>
              <span className={styles.pulse} />
              Queuing Download...
            </span>
          ) : (
            <span>
              ⬇ Download{' '}
              {selectedType === 'video'
                ? `${displayQuality}p Video`
                : selectedType === 'audio'
                  ? 'as MP3'
                  : 'Thumbnail'}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
