import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) setError(error.message)
    // On success, the onAuthStateChange listener swaps us into the app.
  }

  const input =
    'w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-base outline-none transition placeholder:text-stone-600 focus:border-berry-500/70'

  return (
    <div className="safe-top relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-10">
      <div className="bg-brand pointer-events-none absolute -top-32 left-1/2 h-72 w-96 -translate-x-1/2 rounded-full opacity-25 blur-3xl" />
      <div className="animate-rise relative w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <img
            src="/pwa-192x192.png"
            alt=""
            className="mb-5 h-20 w-20 rounded-[26px] shadow-2xl shadow-berry-600/40"
          />
          <h1 className="text-brand font-display text-5xl font-bold tracking-tight">
            GoodEats
          </h1>
          <p className="mt-2 text-sm text-stone-400">
            Log what you eat, share it with your friend.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
          {error && <p className="px-1 text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-brand mt-2 rounded-2xl px-4 py-3.5 font-semibold text-white shadow-lg shadow-berry-600/35 transition active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-stone-600">
          Accounts are invite-only. Ask the other person to set yours up.
        </p>
      </div>
    </div>
  )
}
