// Scheduled (cron) function: nudge anyone who hasn't logged a meal today.
// Schedule it for an evening hour via pg_cron (see README).
import { admin, sendToUsers, type PushPayload } from '../_shared/webpush.ts'

Deno.serve(async () => {
  try {
    // Start of the current UTC day. (Good enough for a two-person app; adjust
    // the offset in the cron schedule to roughly match your timezone's evening.)
    const since = new Date()
    since.setUTCHours(0, 0, 0, 0)

    const { data: todays } = await admin
      .from('entries')
      .select('user_id')
      .gte('created_at', since.toISOString())
    const postedToday = new Set((todays ?? []).map((e) => e.user_id as string))

    const { data: profiles } = await admin.from('profiles').select('id')
    const toRemind = (profiles ?? [])
      .map((p) => p.id as string)
      .filter((id) => !postedToday.has(id))

    const payload: PushPayload = {
      title: 'Don’t forget to log your meals 🍴',
      body: 'What did you eat today? Tap to add it.',
      url: '/add',
    }

    const result = await sendToUsers(toRemind, payload)
    return Response.json({ ok: true, reminded: toRemind.length, ...result })
  } catch (err) {
    console.error(err)
    return Response.json({ ok: false, error: String(err) }, { status: 500 })
  }
})
