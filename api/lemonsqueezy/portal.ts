// Vercel serverless — POST /api/lemonsqueezy/portal
// Returns the Lemon Squeezy customer portal URL stored on the user's profile.
// The portal URL is saved during subscription webhook processing.
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId } = req.body as { userId: string }
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('ls_customer_portal_url, plan_type')
    .eq('user_id', userId)
    .single()

  if (!profile) return res.status(404).json({ error: 'Profile not found' })

  // Lifetime users don't have a subscription to manage
  if (profile.plan_type === 'lifetime') {
    return res.status(400).json({ error: 'Lifetime plan — no subscription to manage.' })
  }

  if (!profile.ls_customer_portal_url) {
    return res.status(404).json({ error: 'No billing portal found. Please contact support.' })
  }

  res.json({ url: profile.ls_customer_portal_url })
}
