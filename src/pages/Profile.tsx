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
    setEntries((prev) => prev?.filter((e) => e.id !== entry.id) ?? prev)
    await deleteEntry(entry.id, entry.photoPath)
  }

  const count = entries?.length ?? 0

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

      {entries?.map((e) => (
        <EntryCard
          key={e.id}
          id={e.id}
          authorId={e.userId}
          authorName={e.authorName}
          photoUrl={e.photoUrl}
          caption={e.caption}
          mealType={e.mealType}
          createdAt={e.createdAt}
          isMine={isMe}
          showAuthor={false}
          onEditCaption={isMe ? (caption) => handleEdit(e.id, caption) : undefined}
          onDelete={isMe ? () => handleDelete(e) : undefined}
        />
      ))}
    </div>
  )
}
