// Vercel serverless — POST /api/lemonsqueezy/webhook
// Register this URL in LS dashboard → Settings → Webhooks
// Subscribe to: subscription_created, subscription_updated,
//               subscription_cancelled, subscription_expired, order_created
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

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

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(rawBody)
  const digest = Buffer.from(hmac.digest('hex'))
  const sig = Buffer.from(signature)
  if (digest.length !== sig.length) return false
  return crypto.timingSafeEqual(digest, sig)
}

function getPlanType(variantId: number): 'monthly' | 'annual' | 'lifetime' | null {
  const { LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID, LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID, LEMONSQUEEZY_PRO_LIFETIME_VARIANT_ID } = process.env
  if (LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID  && variantId === parseInt(LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID))  return 'monthly'
  if (LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID   && variantId === parseInt(LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID))   return 'annual'
  if (LEMONSQUEEZY_PRO_LIFETIME_VARIANT_ID && variantId === parseInt(LEMONSQUEEZY_PRO_LIFETIME_VARIANT_ID)) return 'lifetime'
  return null
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()

  const signature = req.headers['x-signature'] as string | undefined
  if (!signature || !process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Missing signature or secret' })
  }

  let rawBody: string
  let payload: any
  try {
    rawBody = await getRawBody(req)
    if (!verifySignature(rawBody, signature, process.env.LEMONSQUEEZY_WEBHOOK_SECRET)) {
      return res.status(400).json({ error: 'Invalid signature' })
    }
    payload = JSON.parse(rawBody)
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }

  const eventName: string = payload.meta?.event_name
  const userId: string | undefined = payload.meta?.custom_data?.userId
  const attrs = payload.data?.attributes ?? {}
  const lsCustomerId = String(attrs.customer_id ?? '')
  const lsSubscriptionId = String(payload.data?.id ?? '')
  const variantId: number = attrs.variant_id
  const planType = getPlanType(variantId)

  try {
    // Helper: resolve userId from custom_data or by looking up ls_customer_id
    const resolveUser = async (): Promise<string | null> => {
      if (userId) return userId
      if (lsCustomerId) {
        const { data } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('ls_customer_id', lsCustomerId)
          .single()
        return data?.user_id ?? null
      }
      return null
    }

    switch (eventName) {
      // ── Subscription created or updated ─────────────────────────────
      case 'subscription_created':
      case 'subscription_updated': {
        const uid = await resolveUser()
        if (!uid) break
        const status: string = attrs.status  // 'on_trial' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired'
        const isPro = status === 'active' || status === 'on_trial'
        const isTrialing = status === 'on_trial'
        const portalUrl: string | undefined = attrs.urls?.customer_portal

        await supabaseAdmin.from('profiles').upsert({
          user_id: uid,
          subscription_tier: isPro ? 'pro' : 'free',
          plan_type: planType,
          is_trialing: isTrialing,
          ls_customer_id: lsCustomerId,
          ls_subscription_id: lsSubscriptionId,
          ls_customer_portal_url: portalUrl ?? null,
          subscription_expires_at: isPro ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        break
      }
      // ── Subscription cancelled or expired ────────────────────────────
      case 'subscription_cancelled':
      case 'subscription_expired': {
        const uid = await resolveUser()
        if (!uid) break
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: 'free',
            plan_type: null,
            is_trialing: false,
            ls_subscription_id: null,
            ls_customer_portal_url: null,
            subscription_expires_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', uid)
        break
      }
      // ── One-time order (lifetime purchase) ──────────────────────────
      case 'order_created': {
        const orderStatus: string = attrs.status
        if (orderStatus !== 'paid') break
        const isLifetime = getPlanType(variantId) === 'lifetime'
        if (!isLifetime) break
        const uid = await resolveUser()
        if (!uid) break
        await supabaseAdmin.from('profiles').upsert({
          user_id: uid,
          subscription_tier: 'pro',
          plan_type: 'lifetime',
          is_trialing: false,
          ls_customer_id: lsCustomerId,
          ls_subscription_id: null,
          ls_customer_portal_url: null,
          subscription_expires_at: null, // never expires
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        break
      }
    }

    res.json({ received: true })
  } catch (err: any) {
    console.error('LS webhook error:', err)
    res.status(500).json({ error: err.message })
  }
}
