import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { MEAL_EMOJI, MEAL_LABELS, type MealType } from '../lib/types'
import PhotoCarousel from './PhotoCarousel'
import Avatar from './Avatar'
import { MoreIcon, PencilIcon, TrashIcon } from './icons'

export interface FeedItem {
  id: string
  authorId: string
  authorName: string
  photoUrls: string[]
  caption: string | null
  mealType: MealType
  createdAt: string
  isMine: boolean
  /** Hide the author avatar/name (e.g. on a profile page). Defaults to shown. */
  showAuthor?: boolean
  onDelete?: () => void
  onEditCaption?: (caption: string) => Promise<void>
}

export default function EntryCard(item: FeedItem) {
  const showAuthor = item.showAuthor ?? true
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.caption ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit() {
    setMenuOpen(false)
    setDraft(item.caption ?? '')
    setError(null)
    setEditing(true)
  }

  async function save() {
    if (!item.onEditCaption) return
    setSaving(true)
    setError(null)
    try {
      await item.onEditCaption(draft)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const when = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
  const hasMenu = item.isMine && (item.onEditCaption || item.onDelete)

  return (
    <article className="animate-rise overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
      <header className="flex items-center gap-3 px-4 py-3">
        {showAuthor ? (
          <Link
            to={`/profile/${item.authorId}`}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <Avatar id={item.authorId} name={item.authorName} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-tight">
                {item.authorName}
              </p>
              <p className="text-xs text-stone-500">{when}</p>
            </div>
          </Link>
        ) : (
          <p className="min-w-0 flex-1 text-xs text-stone-500">{when}</p>
        )}

        {hasMenu && (
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Post options"
              className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition active:bg-white/10"
            >
              <MoreIcon className="h-5 w-5" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="animate-rise absolute right-0 top-10 z-40 w-40 overflow-hidden rounded-2xl bg-raised py-1 shadow-2xl shadow-black/60 ring-1 ring-line">
                  {item.onEditCaption && (
                    <button
                      onClick={startEdit}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-stone-200 active:bg-white/5"
                    >
                      <PencilIcon className="h-4 w-4 text-stone-400" />
                      Edit caption
                    </button>
                  )}
                  {item.onDelete && (
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        item.onDelete?.()
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-rose-400 active:bg-white/5"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </header>

      <div className="relative">
        <PhotoCarousel urls={item.photoUrls} alt={item.caption ?? 'Meal photo'} />
        <span className="glass pointer-events-none absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-semibold text-white">
          {MEAL_EMOJI[item.mealType]} {MEAL_LABELS[item.mealType]}
        </span>
      </div>

      {editing ? (
        <div className="px-4 py-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            autoFocus
            placeholder="Add a caption…"
            className="w-full resize-none rounded-2xl border border-line bg-raised px-3.5 py-2.5 text-base outline-none transition focus:border-orange-500/70"
          />
          {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-stone-400"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="bg-brand rounded-full px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        item.caption && (
          <p className="whitespace-pre-wrap break-words px-4 py-3 text-[15px] leading-relaxed text-stone-200">
            {item.caption}
          </p>
        )
      )}
    </article>
  )
}
