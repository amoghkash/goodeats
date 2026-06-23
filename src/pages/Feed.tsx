import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PHOTO_BUCKET, supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Entry, Profile } from '../lib/types'
import EntryCard, { type FeedItem } from '../components/EntryCard'

export default function Feed() {
  const { session } = useAuth()
  const myId = session?.user.id
  const navigate = useNavigate()

  const [items, setItems] = useState<FeedItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = useCallback(async (entry: Entry) => {
    if (!confirm('Delete this post?')) return
    setItems((prev) => prev?.filter((i) => i.id !== entry.id) ?? prev)
    await supabase.storage.from(PHOTO_BUCKET).remove([entry.photo_path])
    await supabase.from('entries').delete().eq('id', entry.id)
  }, [])

  const load = useCallback(async () => {
    const [{ data: profiles }, { data: entries, error: entriesError }] =
      await Promise.all([
        supabase.from('profiles').select('id, display_name'),
        supabase
          .from('entries')
          .select('id, user_id, photo_path, caption, meal_type, created_at')
          .order('created_at', { ascending: false }),
      ])

    if (entriesError) {
      setError(entriesError.message)
      setItems([])
      return
    }

    const names = new Map<string, string>(
      (profiles ?? ([] as Profile[])).map((p) => [p.id, p.display_name]),
    )

    const rows = (entries ?? []) as Entry[]
    if (rows.length === 0) {
      setError(null)
      setItems([])
      return
    }

    // Batch-sign the private photo URLs (valid for 1 hour).
    const { data: signed } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(
        rows.map((r) => r.photo_path),
        60 * 60,
      )
    const urlByPath = new Map<string, string>()
    signed?.forEach((s) => {
      if (s.signedUrl && s.path) urlByPath.set(s.path, s.signedUrl)
    })

    setError(null)
    setItems(
      rows.map((r) => ({
        id: r.id,
        authorName: names.get(r.user_id) ?? 'Someone',
        photoUrl: urlByPath.get(r.photo_path) ?? '',
        caption: r.caption,
        mealType: r.meal_type,
        createdAt: r.created_at,
        isMine: r.user_id === myId,
        onDelete: () => handleDelete(r),
      })),
    )
  }, [myId, handleDelete])

  useEffect(() => {
    // Initial fetch on mount; subsequent updates come from the realtime channel.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    // Refresh the feed when the realtime entries table changes.
    const channel = supabase
      .channel('entries-feed')
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

  return (
    <div>
      <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-stone-800 bg-stone-900/95 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold">GoodEats</h1>
      </header>

      {error && (
        <p className="px-4 py-6 text-center text-sm text-red-400">{error}</p>
      )}

      {items === null && (
        <p className="px-4 py-10 text-center text-stone-400">Loading feed…</p>
      )}

      {items !== null && items.length === 0 && (
        <div className="px-6 py-16 text-center text-stone-400">
          <p className="text-4xl">🍽️</p>
          <p className="mt-3 font-medium text-stone-200">No meals yet</p>
          <p className="mt-1 text-sm">Tap the + button to log your first meal.</p>
          <button
            onClick={() => navigate('/add')}
            className="mt-5 rounded-xl bg-orange-500 px-5 py-2.5 font-semibold text-white"
          >
            Log a meal
          </button>
        </div>
      )}

      {items?.map((item) => (
        <EntryCard key={item.id} {...item} />
      ))}
    </div>
  )
}
