# localHost9 — Production Website

Full-stack restaurant ordering website. Near-zero cost to run.

## Cost Breakdown

| Service | Cost | What you get |
|---------|------|-------------|
| **Vercel** (hosting) | ₹0/month | Free tier — unlimited static sites, serverless API routes |
| **Supabase** (database) | ₹0/month | Free tier — 500MB Postgres, 50K monthly active users |
| **Domain** | ~₹500/year | From GoDaddy, Namecheap, or Cloudflare |
| **WhatsApp Business** | ₹0 | Free fallback ordering channel |
| **Total** | **~₹40/month** | Just the domain cost |

## Features

- Menu with dish images, descriptions, prices
- Add-to-cart with quantity controls
- Slide-out cart drawer
- Order form with phone-based saved address lookup
- Cash on Delivery (online payment coming soon)
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

### Step 3: WhatsApp Business

1. Set up WhatsApp Business on your phone
2. Add your number (with country code, no +) to `.env.local`:
   ```
   NEXT_PUBLIC_WHATSAPP_NUMBER=919876543210
   ```
3. Customers can tap the floating WhatsApp button or the "Confirm via WhatsApp" link after ordering

### Step 4: Deploy to Vercel (free)

1. Push this code to a GitHub repo
2. Go to https://vercel.com → Sign up with GitHub
3. Click "New Project" → Import your repo
4. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_WHATSAPP_NUMBER`
5. Click Deploy — done!

Your site will be live at `https://your-project.vercel.app`

### Step 5: Custom Domain (₹500-800/year)

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
│   │       ├── health/route.ts             # Health check
│   │       └── admin/                      # Admin-only API routes
│   ├── components/
│   │   ├── Menu.tsx            # Dish grid with add-to-cart
│   │   ├── Cart.tsx            # Slide-out cart drawer
│   │   ├── OrderForm.tsx       # Checkout form + saved addresses
│   │   └── OrderConfirmation.tsx  # Success + order number
│   ├── lib/
│   │   ├── supabase.ts         # Client-side Supabase
│   │   ├── admin.ts            # Admin auth guard + rate limiting
│   │   └── rateLimit.ts        # Per-IP rate limiter
│   └── types/
│       └── index.ts            # TypeScript interfaces
├── .env.local                  # Environment variables
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```
