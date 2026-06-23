// Database Webhook target: fires on INSERT into public.entries.
// Notifies the OTHER user(s) that a new meal was logged.
import { admin, sendToUsers, type PushPayload } from '../_shared/webpush.ts'

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  snack: 'a snack',
}

interface WebhookBody {
  type: string
  table: string
  record: {
    id: string
    user_id: string
    meal_type: string
    caption: string | null
  }
}

Deno.serve(async (req) => {
  try {
    const body = (await req.json()) as WebhookBody

    if (body.type !== 'INSERT' || body.table !== 'entries') {
      return new Response('ignored', { status: 200 })
    }

    const posterId = body.record.user_id

    // Look up everyone else (the two-person feed → the friend).
    const { data: others } = await admin
      .from('profiles')
      .select('id')
      .neq('id', posterId)
    const recipientIds = (others ?? []).map((p) => p.id as string)

    // Poster's name for the notification text.
    const { data: poster } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', posterId)
      .maybeSingle()

    const name = poster?.display_name ?? 'Your friend'
    const meal = MEAL_LABELS[body.record.meal_type] ?? 'a meal'
    const payload: PushPayload = {
      title: `${name} logged ${meal} 🍽️`,
      body: body.record.caption ?? 'Tap to see what they ate.',
      url: '/',
    }

    const result = await sendToUsers(recipientIds, payload)
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error(err)
    return Response.json({ ok: false, error: String(err) }, { status: 500 })
  }
})
