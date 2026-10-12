import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PHOTO_BUCKET, supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import Camera from '../components/Camera'
import PageHeader from '../components/PageHeader'
import { CameraIcon, CloseIcon, GalleryIcon } from '../components/icons'
import { compressImages } from '../lib/images'
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
  const fileInput = useRef<HTMLInputElement>(null)

  const [shots, setShots] = useState<Shot[]>([])
  const [cameraOpen, setCameraOpen] = useState(false)
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addFiles(files: File[]) {
    if (files.length === 0) return
    setShots((prev) => {
      const room = MAX_PHOTOS - prev.length
      const added = files
        .slice(0, room)
        .map((file) => ({ file, preview: URL.createObjectURL(file) }))
      return [...prev, ...added]
    })
  }

  function handleCameraDone(files: File[]) {
    setCameraOpen(false)
    addFiles(files)
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = '' // allow re-picking the same photos / adding more later
    if (picked.length === 0) return
    setError(null)

    const room = MAX_PHOTOS - shots.length
    if (picked.length > room) {
      setError(`You can add up to ${MAX_PHOTOS} photos.`)
    }
    addFiles(await compressImages(picked.slice(0, room)))
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
      <PageHeader
        title="Log a meal"
        right={
          shots.length > 0 && (
            <button
              onClick={handlePost}
              disabled={busy}
              className="bg-brand rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md shadow-berry-600/35 transition active:scale-95 disabled:opacity-50"
            >
              {busy ? 'Posting…' : 'Post'}
            </button>
          )
        }
      />

      <div className="space-y-6 p-4">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
        />

        {shots.length === 0 ? (
          <div className="space-y-3">
            <button
              onClick={() => setCameraOpen(true)}
              className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl bg-surface ring-1 ring-line transition active:scale-[0.99]"
            >
              <div className="bg-brand pointer-events-none absolute -bottom-20 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full opacity-20 blur-3xl" />
              <span className="bg-brand flex h-16 w-16 items-center justify-center rounded-[22px] text-white shadow-lg shadow-berry-600/40">
                <CameraIcon className="h-8 w-8" />
              </span>
              <span className="font-display text-xl font-semibold">
                Take photos
              </span>
              <span className="text-xs text-stone-500">Up to {MAX_PHOTOS}</span>
            </button>
            <button
              onClick={() => fileInput.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface py-3.5 text-sm font-semibold text-stone-200 ring-1 ring-line transition active:scale-[0.99]"
            >
              <GalleryIcon className="h-5 w-5 text-stone-400" />
              Choose from library
            </button>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-3 gap-2">
              {shots.map((shot, i) => (
                <div
                  key={shot.preview}
                  className="animate-rise relative aspect-square overflow-hidden rounded-2xl"
                >
                  <img
                    src={shot.preview}
                    alt={`Selected ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => removeShot(i)}
                    aria-label="Remove photo"
                    className="glass absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-white"
                  >
                    <CloseIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {canAddMore && (
                <button
                  onClick={() => setCameraOpen(true)}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-stone-700 bg-surface text-stone-400 transition active:scale-95"
                >
                  <CameraIcon className="h-6 w-6" />
                  <span className="text-[11px] font-medium">Camera</span>
                </button>
              )}
              {canAddMore && (
                <button
                  onClick={() => fileInput.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-stone-700 bg-surface text-stone-400 transition active:scale-95"
                >
                  <GalleryIcon className="h-6 w-6" />
                  <span className="text-[11px] font-medium">Library</span>
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-stone-500">
              {shots.length}/{MAX_PHOTOS} photos
            </p>
          </div>
        )}

        <section>
          <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Meal
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {MEAL_TYPES.map((m) => {
              const active = mealType === m
              return (
                <button
                  key={m}
                  onClick={() => setMealType(m)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-semibold transition active:scale-95 ${
                    active
                      ? 'bg-berry-500/15 text-berry-300 ring-2 ring-berry-500/70'
                      : 'bg-surface text-stone-400 ring-1 ring-line'
                  }`}
                >
                  <span className={`text-2xl transition ${active ? 'scale-110' : 'grayscale-[40%]'}`}>
                    {MEAL_EMOJI[m]}
                  </span>
                  {MEAL_LABELS[m]}
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Caption
          </h2>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="How was it? (optional)"
            rows={3}
            className="w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-base outline-none transition placeholder:text-stone-600 focus:border-berry-500/70"
          />
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  )
}
