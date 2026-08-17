import { useState, useRef, type KeyboardEvent } from 'react'
import { Search, Clipboard, X, Loader2, PlayCircle } from 'lucide-react'
import styles from './UrlInput.module.css'

interface UrlInputProps {
  value: string
  onChange: (url: string) => void
  onSubmit: () => void
  isLoading: boolean
  error?: string | null
}

export default function UrlInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  error,
}: UrlInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      onChange(text.trim())
      inputRef.current?.focus()
    } catch {
      // clipboard not available
    }
  }

  const handleClear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit()
    }
  }

  const isYouTubeUrl =
    value.includes('youtube.com') || value.includes('youtu.be')

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.inputContainer} ${isFocused ? styles.focused : ''} ${error ? styles.hasError : ''}`}
      >
        <div className={styles.iconLeft}>
          {isYouTubeUrl ? (
            <PlayCircle size={20} className={styles.youtubeIcon} />
          ) : (
            <Search size={20} className={styles.searchIcon} />
          )}
        </div>
        <input
          ref={inputRef}
          id="url-input"
          type="url"
          className={styles.input}
          placeholder="Paste a YouTube URL to get started..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          aria-label="YouTube URL input"
          aria-describedby={error ? 'url-error' : undefined}
          aria-invalid={!!error}
        />
        <div className={styles.actions}>
          {value && (
            <button
              className={styles.iconButton}
              onClick={handleClear}
              disabled={isLoading}
              aria-label="Clear URL"
              id="btn-clear-url"
              type="button"
            >
              <X size={16} />
            </button>
          )}
          <button
            className={styles.pasteButton}
            onClick={handlePaste}
            disabled={isLoading}
            aria-label="Paste from clipboard"
            id="btn-paste"
            type="button"
          >
            <Clipboard size={15} />
            <span>Paste</span>
          </button>
        </div>
      </div>

      {error && (
        <p id="url-error" className={styles.errorText} role="alert">
          {error}
        </p>
      )}

      <button
        id="btn-fetch-info"
        className={styles.fetchButton}
        onClick={onSubmit}
        disabled={isLoading || !value.trim()}
        type="button"
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className={styles.spinner} />
            <span>Fetching Info...</span>
          </>
        ) : (
          <>
            <Search size={18} />
            <span>Get Video Info</span>
          </>
        )}
      </button>
    </div>
  )
}
