// Vercel serverless — POST /api/paddle/create-checkout
// Creates a Paddle hosted checkout for the selected plan.
// Plans: monthly ($4.99/mo), annual ($20/yr), lifetime ($50 one-time).
// 30-day trials are configured on the monthly/annual prices in the Paddle dashboard.
import { Paddle, Environment } from '@paddle/paddle-node-sdk'

const paddle = new Paddle(process.env.PADDLE_API_KEY ?? '', {
  environment: process.env.PADDLE_ENVIRONMENT === 'production'
    ? Environment.production
    : Environment.sandbox,
})

const PRICE_IDS: Record<string, string | undefined> = {
  monthly:  process.env.PADDLE_PRO_MONTHLY_PRICE_ID,
  annual:   process.env.PADDLE_PRO_ANNUAL_PRICE_ID,
  lifetime: process.env.PADDLE_PRO_LIFETIME_PRICE_ID,
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!process.env.PADDLE_API_KEY) {
    return res.status(503).json({ error: 'Paddle not configured' })
  }

  const { userId, plan = 'monthly' } = req.body as { userId: string; plan?: string }
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const priceId = PRICE_IDS[plan]
  if (!priceId) return res.status(400).json({ error: `Unknown plan: ${plan}` })

  const BASE_URL = process.env.VITE_APP_URL ?? 'https://vivtrack.app'

  try {
    const txn = await (paddle.transactions as any).create({
      items: [{ priceId, quantity: 1 }],
      customData: { userId },
      checkout: { url: `${BASE_URL}/settings?plan=success` },
    })

    const checkoutUrl = txn?.checkout?.url
    if (!checkoutUrl) throw new Error('No checkout URL returned from Paddle')

    res.json({ url: checkoutUrl })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
