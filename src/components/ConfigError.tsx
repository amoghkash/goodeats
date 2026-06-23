export default function ConfigError() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-sm">
        <p className="text-4xl">⚙️</p>
        <h1 className="mt-3 text-xl font-bold">App isn’t configured</h1>
        <p className="mt-2 text-sm text-stone-400">
          The Supabase environment variables are missing from this build.
        </p>
        <div className="mt-5 rounded-xl border border-stone-700 bg-stone-800 p-4 text-left text-sm text-stone-300">
          <p className="font-medium text-stone-100">Set these and redeploy:</p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-stone-400">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
            <li>VITE_VAPID_PUBLIC_KEY</li>
          </ul>
          <p className="mt-3 text-xs text-stone-500">
            On Vercel: Project Settings → Environment Variables. Locally: copy
            <code className="mx-1 rounded bg-stone-900 px-1">.env.example</code>
            to <code className="mx-1 rounded bg-stone-900 px-1">.env.local</code>.
          </p>
        </div>
      </div>
    </div>
  )
}
