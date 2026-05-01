# localHost9 — Production Website

Full-stack restaurant ordering website. Near-zero cost to run.

## Cost Breakdown

| Service | Cost | What you get |
|---------|------|-------------|
| **Vercel** (hosting) | ₹0/month | Free tier — unlimited static sites, serverless API routes |
| **Supabase** (database) | ₹0/month | Free tier — 500MB Postgres, 50K monthly active users |
| **Razorpay** (payments) | 2% per txn | No monthly fee, just per-transaction |
| **Domain** | ~₹500/year | From GoDaddy, Namecheap, or Cloudflare |
| **WhatsApp Business** | ₹0 | Free fallback ordering channel |
| **Total** | **~₹40/month** | Just the domain cost |

## Features

- Menu with dish images, descriptions, prices
- Add-to-cart with quantity controls
- Slide-out cart drawer
- Order form with phone-based saved address lookup
- Cash on Delivery + Razorpay online payment
- Custom order ID generation (DishCode-HHmm-Cust4-Seq)
- Order confirmation with WhatsApp confirmation link
- Floating WhatsApp button for fallback ordering
- Fully responsive (mobile-first)
- SEO optimized with Next.js metadata

## Setup Guide

### Step 1: Supabase (you already have this)

Your existing Supabase project with dishes, orders, customers tables is ready.

### Step 2: Run Locally

```bash
cd website
npm install
npm run dev
```

Open http://localhost:3000

### Step 3: Razorpay (optional — skip for COD-only)

1. Go to https://dashboard.razorpay.com → Sign up
2. Get your **Key ID** and **Key Secret** from Settings → API Keys
3. Add to `.env.local`:
   ```
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=xxxxx
   ```
4. For production, switch to live keys (requires KYC)

### Step 4: WhatsApp Business

1. Set up WhatsApp Business on your phone
2. Add your number (with country code, no +) to `.env.local`:
   ```
   NEXT_PUBLIC_WHATSAPP_NUMBER=919876543210
   ```
3. Customers can tap the floating WhatsApp button or the "Confirm via WhatsApp" link after ordering

### Step 5: Deploy to Vercel (free)

1. Push this code to a GitHub repo
2. Go to https://vercel.com → Sign up with GitHub
3. Click "New Project" → Import your repo
4. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` (if using Razorpay)
   - `RAZORPAY_KEY_SECRET` (if using Razorpay)
   - `NEXT_PUBLIC_WHATSAPP_NUMBER`
5. Click Deploy — done!

Your site will be live at `https://your-project.vercel.app`

### Step 6: Custom Domain (₹500-800/year)

1. Buy a domain from Namecheap, GoDaddy, or Cloudflare Registrar
2. In Vercel dashboard → Settings → Domains → Add your domain
3. Update DNS records as Vercel instructs (usually just an A record + CNAME)
4. SSL is automatic and free

## Project Structure

```
website/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # HTML layout, metadata, fonts
│   │   ├── page.tsx            # Main page (menu, cart, order flow)
│   │   ├── globals.css         # Tailwind imports
│   │   └── api/
│   │       ├── generate-order-id/route.ts  # Order ID generation
│   │       ├── create-payment/route.ts     # Razorpay order creation
│   │       └── verify-payment/route.ts     # Razorpay signature verification
│   ├── components/
│   │   ├── Menu.tsx            # Dish grid with add-to-cart
│   │   ├── Cart.tsx            # Slide-out cart drawer
│   │   ├── OrderForm.tsx       # Checkout form + payment selection
│   │   ├── OrderConfirmation.tsx  # Success + WhatsApp confirm
│   │   └── WhatsAppButton.tsx  # Floating WhatsApp FAB
│   ├── lib/
│   │   ├── supabase.ts         # Client-side Supabase
│   │   └── supabase-server.ts  # Server-side Supabase (API routes)
│   └── types/
│       └── index.ts            # TypeScript interfaces
├── .env.local                  # Environment variables
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```
