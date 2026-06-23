import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
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
      <header className="safe-top sticky top-0 z-10 border-b border-stone-800 bg-stone-900/95 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold">Settings</h1>
      </header>

      <div className="p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-stone-800 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500/20 text-lg font-semibold text-orange-400">
            {(name || '?').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{name || 'You'}</p>
            <p className="truncate text-sm text-stone-400">
              {session?.user.email}
            </p>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-stone-300">
            Notifications
          </h2>

          {!supported && (
            <p className="rounded-xl bg-stone-800 p-4 text-sm text-stone-400">
              This browser doesn’t support push notifications.
            </p>
          )}

          {supported && needsInstall && (
            <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 text-sm text-stone-200">
              <p className="font-medium text-orange-300">
                Install the app to get notifications
              </p>
              <p className="mt-1 text-stone-300">
                In Safari, tap the <strong>Share</strong> button, then{' '}
                <strong>Add to Home Screen</strong>. Open GoodEats from your home
                screen and come back here to turn on notifications.
              </p>
            </div>
          )}

          {supported && !needsInstall && (
            <div className="flex items-center justify-between rounded-xl bg-stone-800 p-4">
              <div className="pr-3">
                <p className="text-sm font-medium">
                  {subscribed ? 'Notifications on' : 'Turn on notifications'}
                </p>
                <p className="text-xs text-stone-400">
                  Get pinged when your friend posts, plus a daily reminder.
                </p>
              </div>
              <button
                onClick={toggle}
                disabled={busy || permission === 'denied'}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                  subscribed
                    ? 'bg-stone-700 text-stone-200'
                    : 'bg-orange-500 text-white'
                }`}
              >
                {busy ? '…' : subscribed ? 'Turn off' : 'Enable'}
              </button>
            </div>
          )}

          {permission === 'denied' && (
            <p className="mt-2 text-xs text-stone-500">
              Notifications are blocked. Enable them for GoodEats in your device
              settings, then try again.
            </p>
          )}
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </section>

        <button
          onClick={signOut}
          className="mt-8 w-full rounded-xl border border-stone-700 py-3 font-medium text-stone-300 active:scale-[0.99]"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
