import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import {
  deleteEntry,
  fetchEntries,
  updateCaption,
  type EnrichedEntry,
} from '../lib/entries'
import { useUnreadNoteCount } from '../lib/notes'
import EntryCard from '../components/EntryCard'

export default function Feed() {
  const { session } = useAuth()
  const myId = session?.user.id
  const [entries, setEntries] = useState<EnrichedEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const unreadNotes = useUnreadNoteCount(myId)

  const load = useCallback(async () => {
    try {
      const rows = await fetchEntries()
      setError(null)
      setEntries(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load.')
      setEntries([])
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    const channel = supabase
      .channel('home-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entries' },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  async function handleEdit(id: string, caption: string) {
    await updateCaption(id, caption)
    setEntries(
      (prev) =>
        prev?.map((e) =>
          e.id === id ? { ...e, caption: caption.trim() || null } : e,
        ) ?? prev,
    )
  }

  async function handleDelete(entry: EnrichedEntry) {
    if (!confirm('Delete this post?')) return
    setEntries((prev) => prev?.filter((e) => e.id !== entry.id) ?? prev)
    await deleteEntry(entry.id, entry.photoPaths)
  }

  return (
    <div>
      <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-stone-800 bg-stone-900 px-4 py-3">
        <h1 className="text-lg font-bold">GoodEats</h1>
        <Link
          to="/notes"
          aria-label={
            unreadNotes > 0 ? `Notes (${unreadNotes} unread)` : 'Notes'
          }
          className="relative -mr-1 p-1 text-stone-300"
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
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 20.5l1.6-4.4A8.1 8.1 0 0 1 3 11.5 8.6 8.6 0 0 1 12 3a8.6 8.6 0 0 1 9 8.5Z" />
          </svg>
          {unreadNotes > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
              {unreadNotes > 9 ? '9+' : unreadNotes}
            </span>
          )}
        </Link>
      </header>

      {error && (
        <p className="px-4 py-6 text-center text-sm text-red-400">{error}</p>
      )}

      {entries === null && (
        <p className="px-4 py-10 text-center text-stone-400">Loading feed…</p>
      )}

      {entries !== null && entries.length === 0 && !error && (
        <div className="px-6 py-16 text-center text-stone-400">
          <p className="text-4xl">🍽️</p>
          <p className="mt-3 font-medium text-stone-200">No meals yet</p>
          <p className="mt-1 text-sm">Tap the + button to log your first meal.</p>
          <Link
            to="/add"
            className="mt-5 inline-block rounded-xl bg-orange-500 px-5 py-2.5 font-semibold text-white"
          >
            Log a meal
          </Link>
        </div>
      )}

      {entries?.map((e) => (
        <EntryCard
          key={e.id}
          id={e.id}
          authorId={e.userId}
          authorName={e.authorName}
          photoUrls={e.photoUrls}
          caption={e.caption}
          mealType={e.mealType}
          createdAt={e.createdAt}
          isMine={e.userId === myId}
          onEditCaption={
            e.userId === myId ? (caption) => handleEdit(e.id, caption) : undefined
          }
          onDelete={e.userId === myId ? () => handleDelete(e) : undefined}
        />
      ))}
    </div>
  )
}
