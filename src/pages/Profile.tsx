import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import {
  deleteEntry,
  fetchEntries,
  fetchProfiles,
  updateCaption,
  type EnrichedEntry,
} from '../lib/entries'
import EntryCard from '../components/EntryCard'

export default function Profile() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const isMe = id === session?.user.id

  const [name, setName] = useState<string>('')
  const [entries, setEntries] = useState<EnrichedEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [profiles, rows] = await Promise.all([
        fetchProfiles(),
        fetchEntries(id),
      ])
      setName(profiles.find((p) => p.id === id)?.display_name ?? 'Someone')
      setError(null)
      setEntries(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load.')
      setEntries([])
    }
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    const channel = supabase
      .channel(`profile-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entries' },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load, id])

  async function handleEdit(entryId: string, caption: string) {
    await updateCaption(entryId, caption)
    setEntries(
      (prev) =>
        prev?.map((e) =>
          e.id === entryId ? { ...e, caption: caption.trim() || null } : e,
        ) ?? prev,
    )
  }

  async function handleDelete(entry: EnrichedEntry) {
    if (!confirm('Delete this post?')) return
    setSelectedId(null)
    setEntries((prev) => prev?.filter((e) => e.id !== entry.id) ?? prev)
    await deleteEntry(entry.id, entry.photoPaths)
  }

  const count = entries?.length ?? 0
  const selected = entries?.find((e) => e.id === selectedId) ?? null

  return (
    <div>
      <header className="safe-top sticky top-0 z-10 flex items-center gap-3 border-b border-stone-800 bg-stone-900 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="-ml-1 text-stone-300"
        >
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="truncate text-lg font-bold">{name || 'Profile'}</h1>
      </header>

      <div className="flex flex-col items-center px-4 py-6 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/20 text-2xl font-semibold text-orange-400">
          {(name || '?').charAt(0).toUpperCase()}
        </span>
        <p className="mt-3 text-xl font-bold">
          {name}
          {isMe && (
            <span className="ml-2 rounded-full bg-stone-700 px-2 py-0.5 align-middle text-[11px] font-medium text-stone-300">
              You
            </span>
          )}
        </p>
        <p className="mt-1 text-sm text-stone-400">
          {count} {count === 1 ? 'meal' : 'meals'} logged
        </p>
      </div>

      {error && (
        <p className="px-4 py-6 text-center text-sm text-red-400">{error}</p>
      )}

      {entries === null && (
        <p className="px-4 py-10 text-center text-stone-400">Loading…</p>
      )}

      {entries !== null && entries.length === 0 && !error && (
        <div className="px-6 py-12 text-center text-stone-400">
          <p className="text-4xl">🍽️</p>
          <p className="mt-3">
            {isMe ? 'You haven’t' : `${name} hasn’t`} logged any meals yet.
          </p>
          {isMe && (
            <Link
              to="/add"
              className="mt-5 inline-block rounded-xl bg-orange-500 px-5 py-2.5 font-semibold text-white"
            >
              Log a meal
            </Link>
          )}
        </div>
      )}

      {entries && entries.length > 0 && (
        <div className="grid grid-cols-3 gap-0.5">
          {entries.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelectedId(e.id)}
              className="relative aspect-square bg-stone-800"
            >
              <img
                src={e.photoUrls[0]}
                alt={e.caption ?? 'Meal'}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              {e.photoUrls.length > 1 && (
                <span className="absolute right-1 top-1 text-white drop-shadow">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-label="Multiple photos"
                  >
                    <path d="M7 4h12a2 2 0 0 1 2 2v12h-2V6H7V4zM3 8h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/90"
          onClick={() => setSelectedId(null)}
        >
          <div className="safe-top flex items-center justify-end px-4 py-3">
            <button
              onClick={() => setSelectedId(null)}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-800 text-stone-200"
            >
              <svg
                className="h-5 w-5"
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
          <div
            className="mx-auto max-w-md pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <EntryCard
              id={selected.id}
              authorId={selected.userId}
              authorName={selected.authorName}
              photoUrls={selected.photoUrls}
              caption={selected.caption}
              mealType={selected.mealType}
              createdAt={selected.createdAt}
              isMine={isMe}
              showAuthor={false}
              onEditCaption={
                isMe ? (caption) => handleEdit(selected.id, caption) : undefined
              }
              onDelete={isMe ? () => handleDelete(selected) : undefined}
            />
          </div>
        </div>
      )}
    </div>
  )
}
