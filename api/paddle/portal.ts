// Vercel serverless — POST /api/paddle/portal
// Creates a Paddle customer portal session so the user can manage or cancel.
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
)

const PADDLE_API = process.env.PADDLE_ENVIRONMENT === 'production'
  ? 'https://api.paddle.com'
  : 'https://sandbox-api.paddle.com'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!process.env.PADDLE_API_KEY) return res.status(503).json({ error: 'Paddle not configured' })

  const { userId } = req.body as { userId: string }
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('paddle_customer_id')
    .eq('user_id', userId)
    .single()

  if (!profile?.paddle_customer_id) {
    return res.status(404).json({ error: 'No billing account found. Subscribe first.' })
  }

  try {
    const response = await fetch(
      `${PADDLE_API}/customers/${profile.paddle_customer_id}/portal-sessions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    )
    const body = await response.json() as any
    if (!response.ok) {
      return res.status(response.status).json({ error: body?.error?.detail ?? 'Paddle API error' })
    }

    const portalUrl = body?.data?.urls?.general?.overview
    if (!portalUrl) return res.status(500).json({ error: 'No portal URL in Paddle response' })

    res.json({ url: portalUrl })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
