export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
export type MealType = (typeof MEAL_TYPES)[number]

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: '🥐',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍪',
}

export interface Profile {
  id: string
  display_name: string
}

export const MAX_PHOTOS = 10

export interface Entry {
  id: string
  user_id: string
  photo_paths: string[]
  caption: string | null
  meal_type: MealType
  created_at: string
}

/** An entry joined with its author's profile, as returned by the feed query. */
export interface EntryWithProfile extends Entry {
  profiles: Profile | null
}
