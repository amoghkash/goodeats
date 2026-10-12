import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Note } from './types'

/** How many recent notes the thread shows. */
const THREAD_LIMIT = 200

/** Recent notes between the two of you, oldest first. RLS limits to your own. */
export async function fetchNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('id, sender_id, recipient_id, body, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(THREAD_LIMIT)
  if (error) throw error
  return ((data ?? []) as Note[]).reverse()
}

export async function sendNote(
  senderId: string,
  recipientId: string,
  body: string,
): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .insert({ sender_id: senderId, recipient_id: recipientId, body: body.trim() })
  if (error) throw error
}

/** Mark every unread note sent to you as read. */
export async function markNotesRead(myId: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', myId)
    .is('read_at', null)
  if (error) throw error
}

/** Delete a note you sent. RLS allows own notes only. */
export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}

/** Live count of notes sent to you that you haven't opened yet. */
export function useUnreadNoteCount(myId: string | undefined): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!myId) return
    const load = async () => {
      const { count: n } = await supabase
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', myId)
        .is('read_at', null)
      setCount(n ?? 0)
    }
    load()
    const channel = supabase
      .channel('unread-notes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [myId])

  return count
}
