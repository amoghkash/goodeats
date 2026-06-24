import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PHOTO_BUCKET, supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import Camera from '../components/Camera'
import {
  MAX_PHOTOS,
  MEAL_EMOJI,
  MEAL_LABELS,
  MEAL_TYPES,
  type MealType,
} from '../lib/types'

interface Shot {
  file: File
  preview: string
}

export default function Add() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [shots, setShots] = useState<Shot[]>([])
  const [cameraOpen, setCameraOpen] = useState(false)
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleCameraDone(files: File[]) {
    setCameraOpen(false)
    if (files.length === 0) return
    setShots((prev) => {
      const room = MAX_PHOTOS - prev.length
      const added = files
        .slice(0, room)
        .map((file) => ({ file, preview: URL.createObjectURL(file) }))
      return [...prev, ...added]
    })
  }

  function removeShot(index: number) {
    setShots((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handlePost() {
    if (shots.length === 0 || !session) return
    setBusy(true)
    setError(null)

    const userId = session.user.id
    const paths: string[] = []

    for (const shot of shots) {
      const path = `${userId}/${crypto.randomUUID()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, shot.file, { contentType: 'image/jpeg', upsert: false })
      if (uploadError) {
        if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths)
        setBusy(false)
        setError(uploadError.message)
        return
      }
      paths.push(path)
    }

    const { error: insertError } = await supabase.from('entries').insert({
      user_id: userId,
      photo_paths: paths,
      caption: caption.trim() || null,
      meal_type: mealType,
    })

    if (insertError) {
      await supabase.storage.from(PHOTO_BUCKET).remove(paths)
      setBusy(false)
      setError(insertError.message)
      return
    }

    navigate('/')
  }

  const canAddMore = shots.length < MAX_PHOTOS

  if (cameraOpen) {
    return (
      <Camera
        initialCount={shots.length}
        max={MAX_PHOTOS}
        onDone={handleCameraDone}
        onCancel={() => setCameraOpen(false)}
      />
    )
  }

  return (
    <div>
      <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-stone-800 bg-stone-900 px-4 py-3">
        <h1 className="text-lg font-bold">Log a meal</h1>
        {shots.length > 0 && (
          <button
            onClick={handlePost}
            disabled={busy}
            className="rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Posting…' : 'Post'}
          </button>
        )}
      </header>

      <div className="p-4">
        {shots.length === 0 ? (
          <button
            onClick={() => setCameraOpen(true)}
            className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-stone-700 bg-stone-800/50 text-stone-400 transition active:scale-[0.99]"
          >
            <svg
              className="h-12 w-12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="font-medium">Take photos</span>
            <span className="text-xs text-stone-500">Up to {MAX_PHOTOS}</span>
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {shots.map((shot, i) => (
              <div
                key={shot.preview}
                className="relative aspect-square overflow-hidden rounded-xl"
              >
                <img
                  src={shot.preview}
                  alt={`Selected ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => removeShot(i)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {canAddMore && (
              <button
                onClick={() => setCameraOpen(true)}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-700 bg-stone-800/50 text-stone-400"
              >
                <svg
                  className="h-7 w-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="text-[11px]">Add</span>
              </button>
            )}
          </div>
        )}

        {shots.length > 0 && (
          <p className="mt-2 text-xs text-stone-500">
            {shots.length}/{MAX_PHOTOS} photos
          </p>
        )}

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-stone-300">Meal</p>
          <div className="grid grid-cols-4 gap-2">
            {MEAL_TYPES.map((m) => (
              <button
                key={m}
                onClick={() => setMealType(m)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs transition ${
                  mealType === m
                    ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                    : 'border-stone-700 bg-stone-800 text-stone-300'
                }`}
              >
                <span className="text-lg">{MEAL_EMOJI[m]}</span>
                {MEAL_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a note (optional)…"
          rows={3}
          className="mt-5 w-full resize-none rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-base outline-none focus:border-orange-500"
        />

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  )
}
