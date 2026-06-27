// Vercel serverless — POST /api/paddle/webhook
// Paddle sends all subscription/transaction lifecycle events here.
// Register this URL in Paddle dashboard → Notifications.
import { Paddle, Environment } from '@paddle/paddle-node-sdk'
import { createClient } from '@supabase/supabase-js'

const paddle = new Paddle(process.env.PADDLE_API_KEY ?? '', {
  environment: process.env.PADDLE_ENVIRONMENT === 'production'
    ? Environment.production
    : Environment.sandbox,
})

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
)

export const config = { api: { bodyParser: false } }

async function getRawBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

// Resolve a user_id from either customData.userId or paddle_customer_id lookup
async function resolveUserId(customData: any, customerId: string | undefined): Promise<string | null> {
  if (customData?.userId) return customData.userId as string
  if (customerId) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('paddle_customer_id', customerId)
      .single()
    return data?.user_id ?? null
  }
  return null
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['paddle-signature']
  if (!sig || !process.env.PADDLE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Missing Paddle signature or secret' })
  }

  let event: any
  try {
    const rawBody = await getRawBody(req)
    event = paddle.webhooks.unmarshal(rawBody, process.env.PADDLE_WEBHOOK_SECRET, sig)
    if (!event) throw new Error('Unmarshal returned null — bad signature')
  } catch (err: any) {
    return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` })
  }

  try {
    const data = event.data
    const customData = data?.customData
    const customerId: string | undefined = data?.customerId ?? data?.customer?.id

    switch (event.eventType) {
      // ── Subscription started (trial or paid) ──────────────────────────
      case 'subscription.created':
      case 'subscription.updated': {
        const uid = await resolveUserId(customData, customerId)
        if (!uid) break
        const status: string = data.status
        const isPro = status === 'active' || status === 'trialing'
        const billingInterval: string | undefined = data.billingCycle?.interval ?? data.items?.[0]?.price?.billingCycle?.interval
        const planType = billingInterval === 'month' ? 'monthly' : 'annual'
        await supabaseAdmin.from('profiles').upsert({
          user_id: uid,
          subscription_tier: isPro ? 'pro' : 'free',
          plan_type: planType,
          is_trialing: status === 'trialing',
          paddle_customer_id: customerId,
          paddle_subscription_id: data.id,
          subscription_expires_at: isPro ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        break
      }
      // ── Subscription cancelled ─────────────────────────────────────────
      case 'subscription.canceled': {
        const uid = await resolveUserId(customData, customerId)
        if (!uid) break
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: 'free',
            plan_type: null,
            is_trialing: false,
            paddle_subscription_id: null,
            subscription_expires_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', uid)
        break
      }
      // ── One-time payment completed (lifetime purchase) ─────────────────
      case 'transaction.completed': {
        const lifetimePriceId = process.env.PADDLE_PRO_LIFETIME_PRICE_ID
        const transactionPriceId: string | undefined = data?.items?.[0]?.price?.id
        if (!lifetimePriceId || transactionPriceId !== lifetimePriceId) break
        const uid = await resolveUserId(customData, customerId)
        if (!uid) break
        await supabaseAdmin.from('profiles').upsert({
          user_id: uid,
          subscription_tier: 'pro',
          plan_type: 'lifetime',
          is_trialing: false,
          paddle_customer_id: customerId,
          paddle_subscription_id: null,
          subscription_expires_at: null, // never expires
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        break
      }
    }

    res.json({ received: true })
  } catch (err: any) {
    console.error('Paddle webhook error:', err)
    res.status(500).json({ error: err.message })
  }
}
