import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import PageHeader from '../components/PageHeader'
import Avatar from '../components/Avatar'
import { BellIcon, ChevronRightIcon, LogOutIcon } from '../components/icons'
import { supabase } from '../lib/supabase'
import {
  disablePush,
  enablePush,
  isStandalone,
  isSubscribed,
  notificationPermission,
  pushSupported,
} from '../lib/push'

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export default function Settings() {
  const { session, signOut } = useAuth()
  const [name, setName] = useState<string>('')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supported = pushSupported()
  const standalone = isStandalone()
  const permission = notificationPermission()

  useEffect(() => {
    if (!session) return
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setName(data?.display_name ?? session.user.email ?? ''))
    isSubscribed().then(setSubscribed)
  }, [session])

  async function toggle() {
    setError(null)
    setBusy(true)
    try {
      if (subscribed) {
        await disablePush()
        setSubscribed(false)
      } else {
        await enablePush()
        setSubscribed(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  // On iOS, push only works once the app is installed to the Home Screen.
  const needsInstall = isIOS() && !standalone

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="space-y-7 p-4">
        <Link
          to={`/profile/${session?.user.id}`}
          className="flex items-center gap-3.5 rounded-3xl bg-surface p-4 ring-1 ring-line transition active:scale-[0.99]"
        >
          <Avatar id={session?.user.id ?? ''} name={name || '?'} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-semibold">
              {name || 'You'}
            </p>
            <p className="truncate text-sm text-stone-500">
              {session?.user.email}
            </p>
          </div>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-stone-600" />
        </Link>

        <section>
          <h2 className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Notifications
          </h2>

          {!supported && (
            <p className="rounded-3xl bg-surface p-4 text-sm text-stone-400 ring-1 ring-line">
              This browser doesn’t support push notifications.
            </p>
          )}

          {supported && needsInstall && (
            <div className="rounded-3xl bg-orange-500/10 p-4 text-sm ring-1 ring-orange-500/30">
              <p className="font-semibold text-orange-300">
                Install the app to get notifications
              </p>
              <p className="mt-1 leading-relaxed text-stone-300">
                In Safari, tap the <strong>Share</strong> button, then{' '}
                <strong>Add to Home Screen</strong>. Open GoodEats from your home
                screen and come back here to turn on notifications.
              </p>
            </div>
          )}

          {supported && !needsInstall && (
            <div className="flex items-center gap-3.5 rounded-3xl bg-surface p-4 ring-1 ring-line">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                <BellIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">Push notifications</p>
                <p className="text-xs leading-snug text-stone-500">
                  New meals, notes, and a daily reminder.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={subscribed}
                aria-label="Push notifications"
                onClick={toggle}
                disabled={busy || permission === 'denied'}
                className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
                  subscribed ? 'bg-brand' : 'bg-stone-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    subscribed ? 'translate-x-5' : ''
                  } ${busy ? 'animate-pulse' : ''}`}
                />
              </button>
            </div>
          )}

          {permission === 'denied' && (
            <p className="mt-2 px-1 text-xs text-stone-500">
              Notifications are blocked. Enable them for GoodEats in your device
              settings, then try again.
            </p>
          )}
          {error && <p className="mt-2 px-1 text-sm text-rose-400">{error}</p>}
        </section>

        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-3xl bg-surface py-4 font-semibold text-rose-400 ring-1 ring-line transition active:scale-[0.99]"
        >
          <LogOutIcon className="h-5 w-5" />
          Sign out
        </button>

        <p className="text-center font-mono text-[11px] text-stone-700">
          build {__COMMIT_HASH__}
        </p>
      </div>
    </div>
  )
}
