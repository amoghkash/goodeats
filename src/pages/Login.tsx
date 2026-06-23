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

  return (
    <div className="safe-top flex h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/pwa-192x192.png" alt="" className="mb-3 h-16 w-16 rounded-2xl" />
          <h1 className="text-2xl font-bold">GoodEats</h1>
          <p className="mt-1 text-sm text-stone-400">
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
            className="rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-base outline-none focus:border-orange-500"
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-base outline-none focus:border-orange-500"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-500">
          Accounts are invite-only. Ask the other person to set yours up.
        </p>
      </div>
    </div>
  )
}
