import Stripe from 'stripe'

// Server-only Stripe client. The secret key never reaches the browser.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
