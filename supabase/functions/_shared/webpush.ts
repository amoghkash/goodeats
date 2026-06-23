// Shared helpers for sending Web Push from Supabase Edge Functions (Deno).
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

// Service-role client bypasses RLS — only ever runs server-side in the function.
export const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

export interface PushPayload {
  title: string
  body: string
  url?: string
}

interface SubscriptionRow {
  endpoint: string
  subscription: webpush.PushSubscription
}

/**
 * Send a notification to every subscription belonging to the given users.
 * Dead subscriptions (404/410) are pruned from the database.
 */
export async function sendToUsers(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0) return { sent: 0, pruned: 0 }

  const { data, error } = await admin
    .from('push_subscriptions')
    .select('endpoint, subscription')
    .in('user_id', userIds)

  if (error) throw error
  const rows = (data ?? []) as SubscriptionRow[]

  let sent = 0
  let pruned = 0
  const body = JSON.stringify(payload)

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, body)
        sent++
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await admin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', row.endpoint)
          pruned++
        } else {
          console.error('push send failed', status, err)
        }
      }
    }),
  )

  return { sent, pruned }
}
