import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { MEAL_EMOJI, MEAL_LABELS, type MealType } from '../lib/types'
import PhotoCarousel from './PhotoCarousel'

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

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export default function EntryCard(item: FeedItem) {
  const showAuthor = item.showAuthor ?? true
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.caption ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit() {
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

  const showFooter = editing || item.caption || item.isMine

  return (
    <article className="overflow-hidden border-b border-stone-800 bg-stone-900">
      <header className="flex items-center gap-3 px-4 py-3">
        {showAuthor ? (
          <Link
            to={`/profile/${item.authorId}`}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/20 text-sm font-semibold text-orange-400">
              {initialOf(item.authorName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.authorName}</p>
              <p className="text-xs text-stone-400">
                {formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </Link>
        ) : (
          <p className="min-w-0 flex-1 text-xs text-stone-400">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </p>
        )}
        <span className="shrink-0 rounded-full bg-stone-800 px-2.5 py-1 text-xs text-stone-300">
          {MEAL_EMOJI[item.mealType]} {MEAL_LABELS[item.mealType]}
        </span>
      </header>

      <PhotoCarousel urls={item.photoUrls} alt={item.caption ?? 'Meal photo'} />

      {showFooter && (
        <div className="px-4 py-3">
          {editing ? (
            <div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                autoFocus
                placeholder="Add a note…"
                className="w-full resize-none rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
              {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-stone-400"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              {item.caption ? (
                <p className="flex-1 text-sm text-stone-200">{item.caption}</p>
              ) : (
                <p className="flex-1 text-sm italic text-stone-500">No caption</p>
              )}
              {item.isMine && (
                <div className="flex shrink-0 gap-3">
                  {item.onEditCaption && (
                    <button
                      onClick={startEdit}
                      className="text-xs text-stone-500 hover:text-orange-400"
                    >
                      Edit
                    </button>
                  )}
                  {item.onDelete && (
                    <button
                      onClick={item.onDelete}
                      className="text-xs text-stone-500 hover:text-red-400"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
