// Database Webhook target: fires on INSERT into public.notes.
// Pushes the note to its recipient.
import { admin, sendToUsers, type PushPayload } from '../_shared/webpush.ts'

interface WebhookBody {
  type: string
  table: string
  record: {
    id: string
    sender_id: string
    recipient_id: string
    body: string
  }
}

Deno.serve(async (req) => {
  try {
    const body = (await req.json()) as WebhookBody

    if (body.type !== 'INSERT' || body.table !== 'notes') {
      return new Response('ignored', { status: 200 })
    }

    const { data: sender } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', body.record.sender_id)
      .maybeSingle()

    const name = sender?.display_name ?? 'Your friend'
    const payload: PushPayload = {
      title: `💬 ${name}`,
      body: body.record.body,
      url: '/notes',
    }

    const result = await sendToUsers([body.record.recipient_id], payload)
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error(err)
    return Response.json({ ok: false, error: String(err) }, { status: 500 })
  }
})
