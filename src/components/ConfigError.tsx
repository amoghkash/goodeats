export default function ConfigError() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-sm">
        <p className="text-4xl">⚙️</p>
        <h1 className="mt-3 font-display text-2xl font-semibold">App isn’t configured</h1>
        <p className="mt-2 text-sm text-stone-400">
          The Supabase environment variables are missing from this build.
        </p>
        <div className="mt-5 rounded-3xl bg-surface p-4 ring-1 ring-line text-left text-sm text-stone-300">
          <p className="font-medium text-stone-100">Set these and redeploy:</p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-stone-400">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
            <li>VITE_VAPID_PUBLIC_KEY</li>
          </ul>
          <p className="mt-3 text-xs text-stone-500">
            On Vercel: Project Settings → Environment Variables. Locally: copy
            <code className="mx-1 rounded bg-raised px-1">.env.example</code>
            to <code className="mx-1 rounded bg-raised px-1">.env.local</code>.
          </p>
        </div>
      </div>
    </div>
  )
}
