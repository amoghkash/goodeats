import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { fetchProfiles } from '../lib/entries'
import {
  clearNote,
  fetchActiveNotes,
  markNoteSeen,
  setNote,
  timeLeft,
} from '../lib/notes'
import { NOTE_MAX_LENGTH, type Note, type Profile } from '../lib/types'
import Avatar from './Avatar'
import { PlusIcon } from './icons'

/**
 * Instagram-style notes: each of you has at most one short note, shown in a
 * bubble above your avatar. Notes vanish after 24 hours; posting a new one
 * replaces the old one.
 */
export default function NotesStrip() {
  const { session } = useAuth()
  const myId = session?.user.id

  const [me, setMe] = useState<Profile | null>(null)
  const [friend, setFriend] = useState<Profile | null>(null)
  const [notes, setNotes] = useState<Map<string, Note>>(new Map())
  const [open, setOpen] = useState<'mine' | 'theirs' | null>(null)

  const load = useCallback(async () => {
    if (!myId) return
    try {
      const [profiles, active] = await Promise.all([
        fetchProfiles(),
        fetchActiveNotes(),
      ])
      setMe(profiles.find((p) => p.id === myId) ?? null)
      setFriend(profiles.find((p) => p.id !== myId) ?? null)
      setNotes(active)
    } catch {
      // Notes are a nice-to-have; leave the strip as it was.
    }
  }, [myId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    const channel = supabase
      .channel('notes-strip')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        () => load(),
      )
      .subscribe()
    // Re-check now and then so expired notes drop off while the app is open.
    const timer = setInterval(load, 60_000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(timer)
    }
  }, [load])

  if (!myId) return null

  const myNote = notes.get(myId) ?? null
  const friendNote = friend ? (notes.get(friend.id) ?? null) : null
  const friendUnseen = Boolean(friendNote && !friendNote.read_at)

  function openTheirs() {
    if (!friendNote) return
    setOpen('theirs')
    if (!friendNote.read_at) {
      void markNoteSeen(friendNote.id).then(load)
    }
  }

  return (
    <section className="flex gap-4 overflow-x-auto px-4 pt-4 pb-1">
      <NoteSlot
        id={myId}
        name={me?.display_name ?? 'You'}
        label="Your note"
        onClick={() => setOpen('mine')}
        bubble={
          myNote ? (
            myNote.body
          ) : (
            <span className="flex items-center justify-center gap-1 text-stone-500">
              <PlusIcon className="h-3.5 w-3.5" />
              Note
            </span>
          )
        }
        muted={!myNote}
      />

      {friend && (
        <NoteSlot
          id={friend.id}
          name={friend.display_name}
          label={friend.display_name}
          onClick={friendNote ? openTheirs : undefined}
          bubble={friendNote?.body}
          highlight={friendUnseen}
        />
      )}

      {open === 'mine' && friend && (
        <ComposeNote
          myId={myId}
          friend={friend}
          current={myNote}
          onClose={() => setOpen(null)}
          onSaved={load}
        />
      )}

      {open === 'theirs' && friend && friendNote && (
        <Sheet onClose={() => setOpen(null)}>
          <div className="flex items-center gap-3">
            <Avatar id={friend.id} name={friend.display_name} size="md" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{friend.display_name}</p>
              <p className="text-xs text-stone-500">
                {formatDistanceToNow(new Date(friendNote.created_at), {
                  addSuffix: true,
                })}{' '}
                · {timeLeft(friendNote)}
              </p>
            </div>
          </div>
          <p className="mt-5 whitespace-pre-wrap break-words rounded-3xl bg-raised px-5 py-6 text-center font-display text-2xl leading-snug ring-1 ring-line">
            {friendNote.body}
          </p>
          <button
            onClick={() => setOpen(null)}
            className="mt-5 w-full rounded-2xl bg-raised py-3 text-sm font-semibold text-stone-200 ring-1 ring-line"
          >
            Close
          </button>
        </Sheet>
      )}
    </section>
  )
}

function NoteSlot({
  id,
  name,
  label,
  bubble,
  muted = false,
  highlight = false,
  onClick,
}: {
  id: string
  name: string
  label: string
  bubble?: ReactNode
  muted?: boolean
  highlight?: boolean
  onClick?: () => void
}) {
  const bubbleTone = highlight
    ? 'bg-berry-600/20 ring-berry-500/60 text-stone-50'
    : muted
      ? 'bg-surface ring-line'
      : 'bg-raised ring-line text-stone-100'

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex w-28 shrink-0 flex-col items-center transition active:scale-95 disabled:active:scale-100"
    >
      {/* Thought bubble (kept as a fixed-height slot so avatars line up). */}
      <div className="flex h-[68px] w-full items-end justify-center">
        {bubble && (
          <div
            className={`animate-rise relative max-w-full rounded-2xl px-3 py-2 text-center text-xs leading-snug ring-1 ${bubbleTone}`}
          >
            <span className="line-clamp-3 break-words">{bubble}</span>
            <span
              className={`absolute -bottom-[11px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full ring-1 ${bubbleTone}`}
            />
          </div>
        )}
      </div>
      <div className="relative mt-3.5">
        <Avatar id={id} name={name} size="md" />
        {highlight && (
          <span className="bg-brand absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-canvas" />
        )}
      </div>
      <span className="mt-1.5 max-w-full truncate text-[11px] font-medium text-stone-400">
        {label}
      </span>
    </button>
  )
}

function ComposeNote({
  myId,
  friend,
  current,
  onClose,
  onSaved,
}: {
  myId: string
  friend: Profile
  current: Note | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [draft, setDraft] = useState(current?.body ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  const share = () => {
    const body = draft.trim()
    if (!body || busy) return
    void run(() => setNote(myId, friend.id, body))
  }

  return (
    <Sheet onClose={onClose}>
      <p className="font-display text-2xl font-semibold">Your note</p>
      <p className="mt-1 text-sm text-stone-400">
        {current
          ? `Posted ${formatDistanceToNow(new Date(current.created_at), {
              addSuffix: true,
            })} · ${timeLeft(current)}${
              current.read_at ? ` · Seen by ${friend.display_name}` : ''
            }`
          : `${friend.display_name} will get a notification. It disappears after 24 hours.`}
      </p>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\n/g, ' '))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            share()
          }
        }}
        rows={3}
        autoFocus
        maxLength={NOTE_MAX_LENGTH}
        enterKeyHint="done"
        placeholder="What’s on your mind?"
        className="mt-4 w-full resize-none rounded-3xl border border-line bg-raised px-5 py-4 text-center font-display text-xl leading-snug outline-none transition placeholder:text-stone-600 focus:border-berry-500/70"
      />
      <p className="mt-1 px-2 text-right text-[11px] text-stone-500">
        {NOTE_MAX_LENGTH - draft.length}
      </p>

      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}

      <div className="mt-3 flex gap-2">
        {current && (
          <button
            onClick={() => run(() => clearNote(myId))}
            disabled={busy}
            className="rounded-2xl px-4 py-3 text-sm font-semibold text-red-400 disabled:opacity-50"
          >
            Clear
          </button>
        )}
        <button
          onClick={onClose}
          className="ml-auto rounded-2xl px-4 py-3 text-sm font-semibold text-stone-400"
        >
          Cancel
        </button>
        <button
          onClick={share}
          disabled={!draft.trim() || busy || draft.trim() === current?.body}
          className="bg-brand rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-md shadow-berry-600/35 transition active:scale-95 disabled:opacity-40 disabled:shadow-none"
        >
          {busy ? 'Sharing…' : 'Share'}
        </button>
      </div>
    </Sheet>
  )
}

/** Centered pop-up card (centered rather than bottom-anchored so the iOS
 *  keyboard never covers it). */
function Sheet({
  children,
  onClose,
}: {
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-rise w-full max-w-sm rounded-[28px] bg-surface p-5 text-left shadow-2xl shadow-black/60 ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
