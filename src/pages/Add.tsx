import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import { PHOTO_BUCKET, supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { MEAL_EMOJI, MEAL_LABELS, MEAL_TYPES, type MealType } from '../lib/types'

export default function Add() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (!picked) return
    setError(null)
    try {
      const compressed = await imageCompression(picked, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
        fileType: 'image/jpeg',
      })
      setFile(compressed)
      setPreview(URL.createObjectURL(compressed))
    } catch {
      // If compression fails for any reason, fall back to the original file.
      setFile(picked)
      setPreview(URL.createObjectURL(picked))
    }
  }

  async function handlePost() {
    if (!file || !session) return
    setBusy(true)
    setError(null)

    const userId = session.user.id
    const path = `${userId}/${crypto.randomUUID()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { contentType: 'image/jpeg', upsert: false })

    if (uploadError) {
      setBusy(false)
      setError(uploadError.message)
      return
    }

    const { error: insertError } = await supabase.from('entries').insert({
      user_id: userId,
      photo_path: path,
      caption: caption.trim() || null,
      meal_type: mealType,
    })

    if (insertError) {
      // Roll back the orphaned upload so storage doesn't accumulate junk.
      await supabase.storage.from(PHOTO_BUCKET).remove([path])
      setBusy(false)
      setError(insertError.message)
      return
    }

    navigate('/')
  }

  return (
    <div>
      <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-stone-800 bg-stone-900/95 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold">Log a meal</h1>
        {file && (
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
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
        />

        {!preview ? (
          <button
            onClick={() => fileInput.current?.click()}
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
            <span className="font-medium">Take a photo</span>
          </button>
        ) : (
          <button
            onClick={() => fileInput.current?.click()}
            className="relative block w-full overflow-hidden rounded-2xl"
          >
            <img
              src={preview}
              alt="Selected meal"
              className="aspect-square w-full object-cover"
            />
            <span className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-3 py-1 text-xs text-white">
              Retake
            </span>
          </button>
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
