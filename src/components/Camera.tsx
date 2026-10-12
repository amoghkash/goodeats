import { useEffect, useRef, useState } from 'react'
import { compressImages } from '../lib/images'
import { FlipIcon, GalleryIcon } from './icons'

interface CameraShot {
  file: File
  url: string
}

type Facing = 'environment' | 'user'

interface Props {
  /** Photos already added on the Add screen — counts toward the max. */
  initialCount: number
  max: number
  onDone: (files: File[]) => void
  onCancel: () => void
}

/**
 * Full-screen in-app camera. Starts on the rear camera; the flip button
 * switches to selfie mode and back. Tap the shutter repeatedly to add several
 * photos in one session, pull more in from the photo library, then "Done".
 */
export default function Camera({ initialCount, max, onDone, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [facing, setFacing] = useState<Facing>('environment')
  const [canFlip, setCanFlip] = useState(false)
  const [shots, setShots] = useState<CameraShot[]>([])
  const [error, setError] = useState<string | null>(null)

  const remaining = max - initialCount - shots.length
  const mirrored = facing === 'user'

  useEffect(() => {
    let active = true
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing }, audio: false })
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
        // Device labels/counts are only reliable once permission is granted.
        return navigator.mediaDevices.enumerateDevices().then((devices) => {
          if (active) {
            setCanFlip(devices.filter((d) => d.kind === 'videoinput').length > 1)
          }
        })
      })
      .catch(() => {
        if (active) {
          setError(
            'Could not open the camera. Make sure camera access is allowed for this app.',
          )
        }
      })
    return () => {
      active = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [facing])

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  function flip() {
    setError(null)
    setFacing((f) => (f === 'environment' ? 'user' : 'environment'))
  }

  function addFiles(files: File[]) {
    setShots((prev) => {
      const room = max - initialCount - prev.length
      const added = files
        .slice(0, room)
        .map((file) => ({ file, url: URL.createObjectURL(file) }))
      return [...prev, ...added]
    })
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
    if (mirrored) {
      // Save selfies the way they looked in the (mirrored) preview.
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, w, h)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `meal-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        })
        addFiles([file])
      },
      'image/jpeg',
      0.85,
    )
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = '' // allow re-picking the same photos later
    if (picked.length === 0) return
    addFiles(await compressImages(picked.slice(0, remaining)))
  }

  function done() {
    stop()
    onDone(shots.map((s) => s.file))
  }

  function cancel() {
    stop()
    onCancel()
  }

  const galleryInput = (
    <input
      ref={fileInput}
      type="file"
      accept="image/*"
      multiple
      onChange={handleFiles}
    />
  )

  const galleryIcon = <GalleryIcon className="h-6 w-6" />

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-stone-300">
        {galleryInput}
        <p className="text-4xl">📷</p>
        <p className="text-sm">{error}</p>
        {shots.length > 0 && (
          <p className="text-xs text-stone-500">
            {shots.length} photo{shots.length === 1 ? '' : 's'} added
          </p>
        )}
        <div className="flex gap-3">
          {remaining > 0 && (
            <button
              onClick={() => fileInput.current?.click()}
              className="rounded-full bg-white/15 px-5 py-2.5 font-semibold text-white"
            >
              Choose from library
            </button>
          )}
          <button
            onClick={shots.length > 0 ? done : cancel}
            className="bg-brand rounded-full px-5 py-2.5 font-semibold text-white"
          >
            {shots.length > 0 ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {galleryInput}
      <div className="safe-top flex items-center justify-between px-4 py-3 text-white">
        <button onClick={cancel} aria-label="Cancel" className="w-16 text-left text-sm">
          Cancel
        </button>
        <span className="text-sm font-medium">
          {initialCount + shots.length}/{max}
        </span>
        <span className="w-16 text-right text-xs text-stone-400">
          {remaining > 0 ? `${remaining} left` : 'Max reached'}
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`h-full w-full object-cover ${mirrored ? '-scale-x-100' : ''}`}
        />
      </div>

      <div className="safe-bottom bg-black px-4 pb-4 pt-3">
        {shots.length > 0 && (
          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
            {shots.map((s) => (
              <img
                key={s.url}
                src={s.url}
                alt="Added photo"
                className="animate-rise h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-white/20"
              />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex w-24 items-center gap-3">
            <button
              onClick={() => fileInput.current?.click()}
              disabled={remaining <= 0}
              aria-label="Choose from library"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white disabled:opacity-40"
            >
              {galleryIcon}
            </button>
            {canFlip && (
              <button
                onClick={flip}
                aria-label={
                  facing === 'user'
                    ? 'Switch to rear camera'
                    : 'Switch to selfie camera'
                }
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
              >
<FlipIcon className="h-6 w-6" />
              </button>
            )}
          </div>
          <button
            onClick={capture}
            disabled={remaining <= 0}
            aria-label="Take photo"
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white/90 transition active:scale-90 disabled:opacity-40"
          >
            <span className="h-14 w-14 rounded-full bg-white" />
          </button>
          <button
            onClick={done}
            className="flex w-24 justify-end"
          >
            <span className="bg-brand rounded-full px-4 py-2 text-sm font-semibold text-white">
              Done
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
