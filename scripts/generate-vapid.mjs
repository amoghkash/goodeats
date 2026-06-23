// Generate a VAPID key pair for Web Push.
//   node scripts/generate-vapid.mjs
// Put the PUBLIC key in .env.local (VITE_VAPID_PUBLIC_KEY) and set BOTH keys as
// Supabase Edge Function secrets (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).
import webpush from 'web-push'

const { publicKey, privateKey } = webpush.generateVAPIDKeys()

console.log('\nVAPID keys generated — keep the private key secret.\n')
console.log('# --- frontend (.env.local) ---')
console.log(`VITE_VAPID_PUBLIC_KEY=${publicKey}\n`)
console.log('# --- Supabase Edge Function secrets ---')
console.log(`VAPID_PUBLIC_KEY=${publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${privateKey}`)
console.log('VAPID_SUBJECT=mailto:you@example.com\n')
