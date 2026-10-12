import { supabase } from './supabase'
import { NOTE_TTL_MS, type Note } from './types'

/** Each person's current (unexpired) note, keyed by sender id. */
export async function fetchActiveNotes(): Promise<Map<string, Note>> {
  const since = new Date(Date.now() - NOTE_TTL_MS).toISOString()
  const { data, error } = await supabase
    .from('notes')
    .select('id, sender_id, recipient_id, body, created_at, read_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
  if (error) throw error

  const bySender = new Map<string, Note>()
  for (const note of (data ?? []) as Note[]) {
    if (!bySender.has(note.sender_id)) bySender.set(note.sender_id, note)
  }
  return bySender
}

/** Replace your note: posts the new one, then clears any earlier ones. */
export async function setNote(
  senderId: string,
  recipientId: string,
  body: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('notes')
    .insert({ sender_id: senderId, recipient_id: recipientId, body: body.trim() })
    .select('id')
    .single()
  if (error) throw error
  await supabase
    .from('notes')
    .delete()
    .eq('sender_id', senderId)
    .neq('id', data.id)
}

/** Remove your note (and any expired ones still lying around). */
export async function clearNote(senderId: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('sender_id', senderId)
  if (error) throw error
}

/** Mark your friend's note as seen. RLS only lets the recipient do this. */
export async function markNoteSeen(id: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)
  if (error) throw error
}

/** Time left before a note disappears, e.g. "22h left" or "15m left". */
export function timeLeft(note: Note): string {
  const ms = new Date(note.created_at).getTime() + NOTE_TTL_MS - Date.now()
  const mins = Math.max(1, Math.round(ms / 60000))
  return mins >= 60 ? `${Math.floor(mins / 60)}h left` : `${mins}m left`
}
