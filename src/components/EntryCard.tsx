import { formatDistanceToNow } from 'date-fns'
import { MEAL_EMOJI, MEAL_LABELS, type MealType } from '../lib/types'

export interface FeedItem {
  id: string
  authorName: string
  photoUrl: string
  caption: string | null
  mealType: MealType
  createdAt: string
  isMine: boolean
  onDelete?: () => void
}

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export default function EntryCard(item: FeedItem) {
  return (
    <article className="overflow-hidden border-b border-stone-800 bg-stone-900">
      <header className="flex items-center gap-3 px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/20 text-sm font-semibold text-orange-400">
          {initialOf(item.authorName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.authorName}</p>
          <p className="text-xs text-stone-400">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </p>
        </div>
        <span className="rounded-full bg-stone-800 px-2.5 py-1 text-xs text-stone-300">
          {MEAL_EMOJI[item.mealType]} {MEAL_LABELS[item.mealType]}
        </span>
      </header>

      <img
        src={item.photoUrl}
        alt={item.caption ?? 'Meal photo'}
        loading="lazy"
        className="aspect-square w-full bg-stone-800 object-cover"
      />

      {(item.caption || item.isMine) && (
        <div className="flex items-start gap-2 px-4 py-3">
          {item.caption && (
            <p className="flex-1 text-sm text-stone-200">{item.caption}</p>
          )}
          {item.isMine && item.onDelete && (
            <button
              onClick={item.onDelete}
              className="shrink-0 text-xs text-stone-500 hover:text-red-400"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </article>
  )
}
