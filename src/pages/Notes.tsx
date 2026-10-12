import { useCallback, useEffect, useRef, useState } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { fetchProfiles } from '../lib/entries'
import { deleteNote, fetchNotes, markNotesRead, sendNote } from '../lib/notes'
import PageHeader from '../components/PageHeader'
import Avatar from '../components/Avatar'
import { SendIcon } from '../components/icons'
import { NOTE_MAX_LENGTH, type Note, type Profile } from '../lib/types'

function dayLabel(date: Date) {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEE, MMM d')
}

export default function Notes() {
  const { session } = useAuth()
  const myId = session?.user.id

  const [friend, setFriend] = useState<Profile | null>(null)
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!myId) return
    try {
      const [profiles, rows] = await Promise.all([fetchProfiles(), fetchNotes()])
      setFriend(profiles.find((p) => p.id !== myId) ?? null)
      setError(null)
      setNotes(rows)
      // Opening the thread counts as reading anything sent to you.
      if (rows.some((n) => n.recipient_id === myId && !n.read_at)) {
        await markNotesRead(myId)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load.')
      setNotes([])
    }
  }, [myId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    const channel = supabase
      .channel('notes-thread')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  // Keep the newest note in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [notes?.length])

  async function send() {
    const body = draft.trim()
    if (!body || !myId || !friend || sending) return
    setSending(true)
    setError(null)
    try {
      await sendNote(myId, friend.id, body)
      setDraft('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send.')
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(note: Note) {
    if (!confirm('Delete this note?')) return
    setNotes((prev) => prev?.filter((n) => n.id !== note.id) ?? prev)
    await deleteNote(note.id)
  }

  const friendName = friend?.display_name ?? 'your friend'
  const remaining = NOTE_MAX_LENGTH - draft.length
  // Show "Seen" under your latest note once your friend has opened it.
  const lastMine = notes?.filter((n) => n.sender_id === myId).at(-1)

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader back="/">
        {friend ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar id={friend.id} name={friend.display_name} />
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold leading-tight">
                {friend.display_name}
              </h1>
              <p className="text-xs text-stone-500">Notes</p>
            </div>
          </div>
        ) : (
          <h1 className="font-display text-[22px] font-semibold tracking-tight">
            Notes
          </h1>
        )}
      </PageHeader>

      <div className="flex-1 px-4 py-3">
        {notes === null && (
          <p className="py-10 text-center text-stone-500">Loading…</p>
        )}

        {notes !== null && notes.length === 0 && !error && (
          <div className="animate-rise flex flex-col items-center px-6 py-20 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-raised text-3xl ring-1 ring-line">
              💬
            </span>
            <p className="mt-4 font-display text-xl font-semibold">
              No notes yet
            </p>
            <p className="mt-1.5 text-sm text-stone-400">
              Send {friendName} a quick note — they’ll get a notification.
            </p>
          </div>
        )}

        {notes?.map((n, i) => {
          const mine = n.sender_id === myId
          const date = new Date(n.created_at)
          const prev = notes[i - 1]
          const next = notes[i + 1]
          const newDay =
            !prev ||
            new Date(prev.created_at).toDateString() !== date.toDateString()
          // Only show the time under the last note in a run from one person.
          const lastInRun =
            !next ||
            next.sender_id !== n.sender_id ||
            new Date(next.created_at).toDateString() !== date.toDateString()
          return (
            <div key={n.id}>
              {newDay && (
                <p className="py-4 text-center text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                  {dayLabel(date)}
                </p>
              )}
              <div
                className={`flex flex-col ${mine ? 'items-end' : 'items-start'} ${lastInRun ? 'mb-3' : 'mb-1'}`}
              >
                <button
                  onClick={mine ? () => handleDelete(n) : undefined}
                  disabled={!mine}
                  className={`max-w-[80%] whitespace-pre-wrap break-words rounded-3xl px-4 py-2.5 text-left text-[15px] leading-snug ${
                    mine
                      ? 'bg-brand text-white shadow-md shadow-orange-500/15'
                      : 'bg-raised text-stone-100 ring-1 ring-line'
                  } ${lastInRun ? (mine ? 'rounded-br-lg' : 'rounded-bl-lg') : ''}`}
                >
                  {n.body}
                </button>
                {lastInRun && (
                  <p className="mt-1 px-2 text-[11px] text-stone-600">
                    {format(date, 'h:mm a')}
                    {n.id === lastMine?.id && n.read_at && ' · Seen'}
                  </p>
                )}
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div className="glass sticky bottom-0 border-t border-line px-3 py-2.5">
        {error && <p className="mb-1 px-1 text-xs text-rose-400">{error}</p>}
        {notes !== null && !friend && !error && (
          <p className="mb-1 px-1 text-xs text-stone-500">
            Add your friend’s profile to start sending notes.
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={1}
            maxLength={NOTE_MAX_LENGTH}
            enterKeyHint="send"
            placeholder={`Note to ${friendName}…`}
            className="max-h-28 min-h-11 flex-1 resize-none rounded-3xl border border-line bg-surface px-4 py-2.5 text-base outline-none transition placeholder:text-stone-600 focus:border-orange-500/70"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || !friend || sending}
            aria-label="Send note"
            className="bg-brand flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-md shadow-orange-500/25 transition active:scale-90 disabled:opacity-35 disabled:shadow-none"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
        {remaining <= 40 && (
          <p className="mt-1 px-2 text-right text-[11px] text-stone-500">
            {remaining} left
          </p>
        )}
      </div>
    </div>
  )
}
