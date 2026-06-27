// Vercel serverless function — POST /api/stripe/create-checkout
// Creates a Stripe Checkout session for the Pro subscription
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2025-06-30.basil' as any })

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, userEmail } = req.body as { userId: string; userEmail: string }

  if (!userId) return res.status(400).json({ error: 'userId required' })
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRO_PRICE_ID) {
    return res.status(503).json({ error: 'Stripe not configured' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      customer_email: userEmail,
      success_url: `${process.env.VITE_APP_URL ?? 'https://vivtrack.app'}/settings?plan=success`,
      cancel_url: `${process.env.VITE_APP_URL ?? 'https://vivtrack.app'}/settings`,
      metadata: { userId },
    })
    res.json({ url: session.url })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
