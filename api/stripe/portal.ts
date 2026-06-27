// Vercel serverless function — POST /api/stripe/portal
// Creates a Stripe Customer Portal session so users can manage/cancel their subscription
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2025-06-30.basil' as any })
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId } = req.body as { userId: string }
  if (!userId) return res.status(400).json({ error: 'userId required' })
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Stripe not configured' })

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (!profile?.stripe_customer_id) {
      return res.status(404).json({ error: 'No billing account found. Please subscribe first.' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.VITE_APP_URL ?? 'https://vivtrack.app'}/settings`,
    })

    res.json({ url: session.url })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
