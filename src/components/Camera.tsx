import { useEffect, useRef, useState } from 'react'

interface CameraShot {
  file: File
  url: string
}

interface Props {
  /** Photos already added on the Add screen — counts toward the max. */
  initialCount: number
  max: number
  onDone: (files: File[]) => void
  onCancel: () => void
}

/**
 * Full-screen in-app camera (rear-facing). Tap the shutter repeatedly to add
 * several photos in one session, then "Done". No photo-library access.
 */
export default function Camera({ initialCount, max, onDone, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [shots, setShots] = useState<CameraShot[]>([])
  const [error, setError] = useState<string | null>(null)

  const remaining = max - initialCount - shots.length

  useEffect(() => {
    let active = true
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play().catch(() => {})
        }
      })
      .catch(() =>
        setError(
          'Could not open the camera. Make sure camera access is allowed for this app.',
        ),
      )
    return () => {
      active = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  function capture() {
    const video = videoRef.current
    if (!video || remaining <= 0) return

    const maxDim = 1280
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return
    const scale = Math.min(1, maxDim / Math.max(vw, vh))
    const w = Math.round(vw * scale)
    const h = Math.round(vh * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `meal-${shots.length + 1}.jpg`, {
          type: 'image/jpeg',
        })
        setShots((prev) => [...prev, { file, url: URL.createObjectURL(blob) }])
      },
      'image/jpeg',
      0.85,
    )
  }

  function done() {
    stop()
    onDone(shots.map((s) => s.file))
  }

  function cancel() {
    stop()
    onCancel()
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-stone-300">
        <p className="text-4xl">📷</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={cancel}
          className="rounded-xl bg-stone-700 px-5 py-2.5 font-medium text-white"
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="safe-top flex items-center justify-between px-4 py-3 text-white">
        <button onClick={cancel} aria-label="Cancel" className="text-sm">
          Cancel
        </button>
        <span className="text-sm font-medium">
          {initialCount + shots.length}/{max}
        </span>
        <span className="w-12" />
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-cover"
        />
      </div>

      <div className="safe-bottom bg-black px-4 pb-4 pt-3">
        {shots.length > 0 && (
          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
            {shots.map((s, i) => (
              <img
                key={i}
                src={s.url}
                alt={`Captured ${i + 1}`}
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="w-16 text-xs text-stone-400">
            {remaining > 0 ? `${remaining} left` : 'Max reached'}
          </span>
          <button
            onClick={capture}
            disabled={remaining <= 0}
            aria-label="Take photo"
            className="h-16 w-16 rounded-full border-4 border-white bg-white/25 transition active:scale-95 disabled:opacity-40"
          />
          <button
            onClick={done}
            className="w-16 text-right font-semibold text-orange-400"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
