// Vercel serverless — POST /api/lemonsqueezy/create-checkout
// Creates a Lemon Squeezy hosted checkout for the selected plan.
// Trials (30-day) are configured on the variant in the LS dashboard.
// Plans: monthly ($4.99/mo), annual ($20/yr), lifetime ($50 one-time)
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js'

lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY ?? '' })

const VARIANT_IDS: Record<string, string | undefined> = {
  monthly:  process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID,
  annual:   process.env.LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID,
  lifetime: process.env.LEMONSQUEEZY_PRO_LIFETIME_VARIANT_ID,
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!process.env.LEMONSQUEEZY_API_KEY || !process.env.LEMONSQUEEZY_STORE_ID) {
    return res.status(503).json({ error: 'Lemon Squeezy not configured' })
  }

  const { userId, plan = 'monthly' } = req.body as { userId: string; plan?: string }
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const variantId = VARIANT_IDS[plan]
  if (!variantId) return res.status(400).json({ error: `Unknown plan: ${plan}` })

  const BASE_URL = process.env.VITE_APP_URL ?? 'https://vivtrack.app'

  try {
    const { data, error } = await createCheckout(
      process.env.LEMONSQUEEZY_STORE_ID,
      variantId,
      {
        checkoutData: {
          custom: { userId },
        },
        productOptions: {
          redirectUrl: `${BASE_URL}/settings?plan=success`,
          enabledVariants: [parseInt(variantId)],
        },
        checkoutOptions: {
          embed: false,
        },
        testMode: process.env.LEMONSQUEEZY_TEST_MODE === 'true',
      }
    )

    if (error || !data) {
      throw new Error((error as any)?.message ?? 'Failed to create checkout')
    }

    const checkoutUrl = (data as any).data?.attributes?.url
    if (!checkoutUrl) throw new Error('No checkout URL returned')

    res.json({ url: checkoutUrl })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
