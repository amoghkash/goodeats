import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
import PageHeader from '../components/PageHeader'
import Avatar from '../components/Avatar'
import { CloseIcon, StackIcon } from '../components/icons'
import { MEAL_EMOJI } from '../lib/types'

export default function Profile() {
  const { id = '' } = useParams()
  const { session } = useAuth()
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
  const photoCount = entries?.reduce((n, e) => n + e.photoUrls.length, 0) ?? 0
  const selected = entries?.find((e) => e.id === selectedId) ?? null

  return (
    <div>
      <PageHeader back title={name || 'Profile'} />

      <div className="relative flex flex-col items-center overflow-hidden px-4 pb-6 pt-8 text-center">
        <div className="bg-brand pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full opacity-25 blur-3xl" />
        <Avatar id={id} name={name || '?'} size="lg" ring />
        <p className="mt-4 font-display text-3xl font-semibold tracking-tight">
          {name}
        </p>
        {isMe && (
          <span className="mt-1.5 rounded-full bg-raised px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400 ring-1 ring-line">
            You
          </span>
        )}
        <div className="mt-5 flex gap-3">
          <div className="min-w-24 rounded-2xl bg-surface px-4 py-2.5 ring-1 ring-line">
            <p className="font-display text-2xl font-semibold">{count}</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
              {count === 1 ? 'Meal' : 'Meals'}
            </p>
          </div>
          <div className="min-w-24 rounded-2xl bg-surface px-4 py-2.5 ring-1 ring-line">
            <p className="font-display text-2xl font-semibold">{photoCount}</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
              {photoCount === 1 ? 'Photo' : 'Photos'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="px-4 py-6 text-center text-sm text-red-400">{error}</p>
      )}

      {entries === null && (
        <div className="grid animate-pulse grid-cols-3 gap-1.5 px-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-surface" />
          ))}
        </div>
      )}

      {entries !== null && entries.length === 0 && !error && (
        <div className="px-6 py-10 text-center text-stone-400">
          <p className="text-4xl">🍽️</p>
          <p className="mt-3">
            {isMe ? 'You haven’t' : `${name} hasn’t`} logged any meals yet.
          </p>
          {isMe && (
            <Link
              to="/add"
              className="bg-brand mt-5 inline-block rounded-full px-6 py-3 font-semibold text-white shadow-lg shadow-berry-600/35"
            >
              Log a meal
            </Link>
          )}
        </div>
      )}

      {entries && entries.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 px-3 pb-6">
          {entries.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelectedId(e.id)}
              className="animate-rise relative aspect-square overflow-hidden rounded-xl bg-surface transition active:scale-[0.97]"
            >
              <img
                src={e.photoUrls[0]}
                alt={e.caption ?? 'Meal'}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-1 left-1 text-sm drop-shadow">
                {MEAL_EMOJI[e.mealType]}
              </span>
              {e.photoUrls.length > 1 && (
                <span className="absolute right-1.5 top-1.5 text-white drop-shadow">
                  <StackIcon className="h-4 w-4" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md"
          onClick={() => setSelectedId(null)}
        >
          <div className="safe-top flex items-center justify-end px-4 py-3">
            <button
              onClick={() => setSelectedId(null)}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-stone-100"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div
            className="mx-auto max-w-md px-3 pb-10"
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
