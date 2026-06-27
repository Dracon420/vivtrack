// Vercel serverless function — POST /api/stripe/webhook
// Handles Stripe subscription lifecycle events and updates Supabase
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2025-06-30.basil' as any })
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
)

export const config = { api: { bodyParser: false } }

async function getRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(400).json({ error: 'Missing signature or secret' })

  let event: Stripe.Event
  try {
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        if (userId && session.customer) {
          // Store Stripe customer ID on the profile
          await supabaseAdmin
            .from('profiles')
            .update({ stripe_customer_id: session.customer as string, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        const tier = sub.status === 'active' || sub.status === 'trialing' ? 'pro' : 'free'
        await supabaseAdmin.rpc('update_stripe_subscription', {
          p_stripe_customer_id: sub.customer as string,
          p_stripe_subscription_id: sub.id,
          p_tier: tier,
          p_expires_at: tier === 'pro' ? null : new Date().toISOString(),
        })
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabaseAdmin.rpc('update_stripe_subscription', {
          p_stripe_customer_id: sub.customer as string,
          p_stripe_subscription_id: sub.id,
          p_tier: 'free',
          p_expires_at: new Date().toISOString(),
        })
        break
      }
      case 'invoice.payment_failed': {
        // Optionally notify user — for now just log
        console.warn('Payment failed for customer:', (event.data.object as Stripe.Invoice).customer)
        break
      }
    }
    res.json({ received: true })
  } catch (err: any) {
    console.error('Webhook handler error:', err)
    res.status(500).json({ error: err.message })
  }
}
