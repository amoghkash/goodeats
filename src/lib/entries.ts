import { PHOTO_BUCKET, supabase } from './supabase'
import type { Entry, MealType, Profile } from './types'

export interface EnrichedEntry {
  id: string
  userId: string
  authorName: string
  photoPath: string
  photoUrl: string
  caption: string | null
  mealType: MealType
  createdAt: string
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .order('display_name')
  if (error) throw error
  return (data ?? []) as Profile[]
}

/** Fetch entries (optionally just one user's), newest first, with signed photo URLs. */
export async function fetchEntries(userId?: string): Promise<EnrichedEntry[]> {
  let query = supabase
    .from('entries')
    .select('id, user_id, photo_path, caption, meal_type, created_at')
  if (userId) query = query.eq('user_id', userId)

  const [{ data: profiles }, { data: entries, error }] = await Promise.all([
    supabase.from('profiles').select('id, display_name'),
    query.order('created_at', { ascending: false }),
  ])
  if (error) throw error

  const names = new Map<string, string>(
    (profiles ?? ([] as Profile[])).map((p) => [p.id, p.display_name]),
  )
  const rows = (entries ?? []) as Entry[]
  if (rows.length === 0) return []

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

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    authorName: names.get(r.user_id) ?? 'Someone',
    photoPath: r.photo_path,
    photoUrl: urlByPath.get(r.photo_path) ?? '',
    caption: r.caption,
    mealType: r.meal_type,
    createdAt: r.created_at,
  }))
}

/** Update an entry's caption (empty string clears it). RLS allows own entries only. */
export async function updateCaption(id: string, caption: string): Promise<void> {
  const { error } = await supabase
    .from('entries')
    .update({ caption: caption.trim() || null })
    .eq('id', id)
  if (error) throw error
}

/** Delete an entry and its photo. RLS allows own entries only. */
export async function deleteEntry(id: string, photoPath: string): Promise<void> {
  await supabase.storage.from(PHOTO_BUCKET).remove([photoPath])
  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) throw error
}
