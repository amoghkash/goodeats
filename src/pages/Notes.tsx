import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, isToday, isYesterday } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { fetchProfiles } from '../lib/entries'
import { deleteNote, fetchNotes, markNotesRead, sendNote } from '../lib/notes'
import { NOTE_MAX_LENGTH, type Note, type Profile } from '../lib/types'

function dayLabel(date: Date) {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEE, MMM d')
}

export default function Notes() {
  const { session } = useAuth()
  const myId = session?.user.id
  const navigate = useNavigate()

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
      <header className="safe-top sticky top-0 z-10 flex items-center gap-3 border-b border-stone-800 bg-stone-900 px-4 py-3">
        <button
          onClick={() => navigate('/')}
          aria-label="Back"
          className="-ml-1 text-stone-300"
        >
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="truncate text-lg font-bold">
          Notes{friend ? ` with ${friend.display_name}` : ''}
        </h1>
      </header>

      <div className="flex-1 px-4 py-3">
        {notes === null && (
          <p className="py-10 text-center text-stone-400">Loading…</p>
        )}

        {notes !== null && notes.length === 0 && !error && (
          <div className="px-2 py-16 text-center text-stone-400">
            <p className="text-4xl">💬</p>
            <p className="mt-3 font-medium text-stone-200">No notes yet</p>
            <p className="mt-1 text-sm">
              Send {friendName} a quick note — they’ll get a notification.
            </p>
          </div>
        )}

        {notes?.map((n, i) => {
          const mine = n.sender_id === myId
          const date = new Date(n.created_at)
          const prev = notes[i - 1]
          const newDay =
            !prev ||
            new Date(prev.created_at).toDateString() !== date.toDateString()
          return (
            <div key={n.id}>
              {newDay && (
                <p className="py-3 text-center text-xs font-medium text-stone-500">
                  {dayLabel(date)}
                </p>
              )}
              <div
                className={`mb-2 flex flex-col ${mine ? 'items-end' : 'items-start'}`}
              >
                <button
                  onClick={mine ? () => handleDelete(n) : undefined}
                  disabled={!mine}
                  className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm ${
                    mine
                      ? 'rounded-br-md bg-orange-500 text-white'
                      : 'rounded-bl-md bg-stone-800 text-stone-100'
                  }`}
                >
                  {n.body}
                </button>
                <p className="mt-0.5 px-1 text-[11px] text-stone-500">
                  {format(date, 'h:mm a')}
                  {n.id === lastMine?.id && n.read_at && ' · Seen'}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 border-t border-stone-800 bg-stone-900 px-3 py-2">
        {error && <p className="mb-1 px-1 text-xs text-red-400">{error}</p>}
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
            className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border border-stone-700 bg-stone-800 px-3.5 py-2 text-base outline-none focus:border-orange-500"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || !friend || sending}
            aria-label="Send note"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition disabled:opacity-40"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
        {remaining <= 40 && (
          <p className="mt-1 px-1 text-right text-[11px] text-stone-500">
            {remaining} left
          </p>
        )}
      </div>
    </div>
  )
}
