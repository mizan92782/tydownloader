import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Zap, Shield, Globe } from 'lucide-react'
import { useDownloadStore } from '../store/downloadStore'
import {
  fetchMediaInfo,
  createDownload,
  getDownloadProgress,
  cancelDownload,
} from '../services/api'
import type { MediaType, DownloadRecord } from '../types'
import UrlInput from '../components/UrlInput'
import MediaPreview from '../components/MediaPreview'
import DownloadProgressCard from '../components/DownloadProgressCard'
import styles from './HomePage.module.css'

const POLL_INTERVAL = 2000

export default function HomePage() {
  const navigate = useNavigate()
  const pollersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  const {
    url, setUrl,
    mediaInfo, setMediaInfo,
    isLoadingInfo, setIsLoadingInfo,
    infoError, setInfoError,
    selectedType, setSelectedType,
    selectedQuality, setSelectedQuality,
    activeDownloads, addDownload, updateDownload, removeDownload,
  } = useDownloadStore()

  // Stop all pollers on unmount
  useEffect(() => {
    return () => {
      pollersRef.current.forEach((timer) => clearInterval(timer))
    }
  }, [])

  const startPolling = useCallback(
    (downloadId: string) => {
      if (pollersRef.current.has(downloadId)) return

      const timer = setInterval(async () => {
        try {
          const progress = await getDownloadProgress(downloadId)
          updateDownload(downloadId, {
            status: progress.status,
            progress: progress.progress,
            speed: progress.speed,
            eta: progress.eta,
            file_size: progress.file_size,
            error_message: progress.error_message,
          })

          if (['completed', 'failed', 'cancelled'].includes(progress.status)) {
            clearInterval(timer)
            pollersRef.current.delete(downloadId)
            if (progress.status === 'completed') {
              toast.success('Download completed! 🎉')
            } else if (progress.status === 'failed') {
              toast.error(`Download failed: ${progress.error_message || 'Unknown error'}`)
            }
          }
        } catch {
          clearInterval(timer)
          pollersRef.current.delete(downloadId)
        }
      }, POLL_INTERVAL)

      pollersRef.current.set(downloadId, timer)
    },
    [updateDownload]
  )

  const handleFetchInfo = async () => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return

    const isValidYouTube =
      trimmedUrl.includes('youtube.com/watch') ||
      trimmedUrl.includes('youtu.be/') ||
      trimmedUrl.includes('youtube.com/shorts')

    if (!isValidYouTube) {
      setInfoError('Please enter a valid YouTube URL (youtube.com or youtu.be)')
      return
    }

    setInfoError(null)
    setIsLoadingInfo(true)
    setMediaInfo(null)

    try {
      const info = await fetchMediaInfo(trimmedUrl)
      setMediaInfo(info)
      if (info.available_qualities?.length > 0) {
        setSelectedQuality(Math.max(...info.available_qualities))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch video info'
      setInfoError(message)
      toast.error(message)
    } finally {
      setIsLoadingInfo(false)
    }
  }

  const handleDownload = async () => {
    if (!mediaInfo || !url.trim()) return

    try {
      const result = await createDownload({
        url: url.trim(),
        type: selectedType,
        quality: selectedType === 'video' ? (selectedQuality ?? undefined) : undefined,
      })

      const newRecord: DownloadRecord = {
        id: result.download_id,
        url: url.trim(),
        media_type: selectedType,
        title: mediaInfo.title,
        thumbnail_url: mediaInfo.thumbnail,
        quality: selectedType === 'video' ? selectedQuality ?? undefined : undefined,
        status: result.status,
        progress: 0,
        created_at: new Date().toISOString(),
      }

      addDownload(newRecord)
      startPolling(result.download_id)
      toast.success('Download queued!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start download'
      toast.error(message)
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelDownload(id)
      updateDownload(id, { status: 'cancelled' })
      const timer = pollersRef.current.get(id)
      if (timer) {
        clearInterval(timer)
        pollersRef.current.delete(id)
      }
      toast('Download cancelled', { icon: '🚫' })
    } catch {
      toast.error('Failed to cancel download')
    }
  }

  const handleDismiss = (id: string) => {
    removeDownload(id)
    const timer = pollersRef.current.get(id)
    if (timer) {
      clearInterval(timer)
      pollersRef.current.delete(id)
    }
  }

  const activeDownloadsList = Object.values(activeDownloads)

  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <Zap size={14} />
            <span>Powered by yt-dlp + FFmpeg</span>
          </div>
          <h1 className={styles.heroTitle}>
            Download YouTube
            <span className={styles.heroTitleGradient}> Videos & Audio</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Instantly download videos in up to 1080p, extract MP3 audio, or save
            thumbnails — all with one click.
          </p>
        </div>

        {/* Features */}
        <div className={styles.features}>
          {[
            { icon: <Zap size={16} />, label: 'Lightning Fast' },
            { icon: <Shield size={16} />, label: 'Safe & Secure' },
            { icon: <Globe size={16} />, label: 'High Quality' },
          ].map((f) => (
            <div key={f.label} className={styles.featureChip}>
              {f.icon}
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* URL Input Section */}
      <section className={styles.inputSection}>
        <UrlInput
          value={url}
          onChange={setUrl}
          onSubmit={handleFetchInfo}
          isLoading={isLoadingInfo}
          error={infoError}
        />
      </section>

      {/* Active Downloads */}
      {activeDownloadsList.length > 0 && (
        <section className={styles.downloadsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Active Downloads</h2>
            <button
              className={styles.viewAllLink}
              onClick={() => navigate('/downloads')}
              type="button"
              id="btn-view-all"
            >
              View History →
            </button>
          </div>
          <div className={styles.downloadList}>
            {activeDownloadsList.map((d) => (
              <DownloadProgressCard
                key={d.id}
                download={d}
                onCancel={handleCancel}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </section>
      )}

      {/* Media Preview */}
      {mediaInfo && (
        <section className={styles.previewSection}>
          <MediaPreview
            info={mediaInfo}
            selectedType={selectedType}
            selectedQuality={selectedQuality}
            onTypeChange={(type: MediaType) => setSelectedType(type)}
            onQualityChange={setSelectedQuality}
            onDownload={handleDownload}
            isDownloading={false}
          />
        </section>
      )}
    </div>
  )
}
