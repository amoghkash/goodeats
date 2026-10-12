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
import PageHeader from '../components/PageHeader'
import { ChatIcon } from '../components/icons'

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
      <PageHeader
        right={
          <Link
            to="/notes"
            aria-label={
              unreadNotes > 0 ? `Notes (${unreadNotes} unread)` : 'Notes'
            }
            className="relative -mr-1 flex h-10 w-10 items-center justify-center rounded-full bg-raised text-stone-200 ring-1 ring-line transition active:scale-95"
          >
            <ChatIcon className="h-5 w-5" />
            {unreadNotes > 0 && (
              <span className="bg-brand absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-canvas">
                {unreadNotes > 9 ? '9+' : unreadNotes}
              </span>
            )}
          </Link>
        }
      >
        <h1 className="text-brand font-display text-[26px] font-bold tracking-tight">
          GoodEats
        </h1>
      </PageHeader>

      {error && (
        <p className="px-4 py-6 text-center text-sm text-rose-400">{error}</p>
      )}

      {entries === null && (
        <div className="space-y-4 px-3 py-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-3xl bg-surface ring-1 ring-line"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="h-9 w-9 rounded-full bg-raised" />
                <span className="h-3 w-28 rounded-full bg-raised" />
              </div>
              <div className="aspect-square bg-raised" />
            </div>
          ))}
        </div>
      )}

      {entries !== null && entries.length === 0 && !error && (
        <div className="animate-rise flex flex-col items-center px-8 py-20 text-center">
          <span className="bg-brand flex h-20 w-20 items-center justify-center rounded-[28px] text-4xl shadow-xl shadow-orange-500/20">
            🍽️
          </span>
          <p className="mt-5 font-display text-2xl font-semibold">
            Nothing on the table yet
          </p>
          <p className="mt-2 text-sm text-stone-400">
            Snap your next meal and it’ll show up here for both of you.
          </p>
          <Link
            to="/add"
            className="bg-brand mt-6 rounded-full px-6 py-3 font-semibold text-white shadow-lg shadow-orange-500/25 transition active:scale-[0.98]"
          >
            Log a meal
          </Link>
        </div>
      )}

      {entries && entries.length > 0 && (
        <div className="space-y-4 px-3 py-4">
          {entries.map((e) => (
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
                e.userId === myId
                  ? (caption) => handleEdit(e.id, caption)
                  : undefined
              }
              onDelete={e.userId === myId ? () => handleDelete(e) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
