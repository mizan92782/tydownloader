import { create } from 'zustand'
import type { MediaInfo, DownloadRecord, MediaType } from '../types'

interface DownloadState {
  // URL Input
  url: string
  setUrl: (url: string) => void

  // Media Info
  mediaInfo: MediaInfo | null
  isLoadingInfo: boolean
  infoError: string | null
  setMediaInfo: (info: MediaInfo | null) => void
  setIsLoadingInfo: (loading: boolean) => void
  setInfoError: (error: string | null) => void

  // Download Options
  selectedType: MediaType
  selectedQuality: number | null
  setSelectedType: (type: MediaType) => void
  setSelectedQuality: (quality: number | null) => void

  // Active Downloads
  activeDownloads: Record<string, DownloadRecord>
  updateDownload: (id: string, data: Partial<DownloadRecord>) => void
  addDownload: (download: DownloadRecord) => void
  removeDownload: (id: string) => void

  // History
  downloadHistory: DownloadRecord[]
  setDownloadHistory: (history: DownloadRecord[]) => void

  // Reset
  resetSearch: () => void
}

export const useDownloadStore = create<DownloadState>((set) => ({
  // URL Input
  url: '',
  setUrl: (url) => set({ url }),

  // Media Info
  mediaInfo: null,
  isLoadingInfo: false,
  infoError: null,
  setMediaInfo: (info) => set({ mediaInfo: info }),
  setIsLoadingInfo: (loading) => set({ isLoadingInfo: loading }),
  setInfoError: (error) => set({ infoError: error }),

  // Download Options
  selectedType: 'video',
  selectedQuality: null,
  setSelectedType: (type) => set({ selectedType: type }),
  setSelectedQuality: (quality) => set({ selectedQuality: quality }),

  // Active Downloads
  activeDownloads: {},
  updateDownload: (id, data) =>
    set((state) => ({
      activeDownloads: {
        ...state.activeDownloads,
        [id]: { ...state.activeDownloads[id], ...data },
      },
    })),
  addDownload: (download) =>
    set((state) => ({
      activeDownloads: {
        ...state.activeDownloads,
        [download.id]: download,
      },
    })),
  removeDownload: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.activeDownloads
      return { activeDownloads: rest }
    }),

  // History
  downloadHistory: [],
  setDownloadHistory: (history) => set({ downloadHistory: history }),

  // Reset
  resetSearch: () =>
    set({
      url: '',
      mediaInfo: null,
      infoError: null,
      selectedType: 'video',
      selectedQuality: null,
    }),
}))
