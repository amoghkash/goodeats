import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * False when the build is missing its Supabase env vars. This usually means the
 * host (e.g. Vercel) wasn't given them at build time — `.env.local` is gitignored
 * and never deployed. The app renders a config screen instead of a blank page.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.error(
    'Missing Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
      'Set them in your host (Vercel → Project Settings → Environment Variables) and redeploy.',
  )
}

// Only constructed when configured; nothing touches this client otherwise
// because main.tsx renders the config screen instead of the app.
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : (undefined as unknown as SupabaseClient)

/** Storage bucket that holds meal photos (private). */
export const PHOTO_BUCKET = 'meal-photos'
