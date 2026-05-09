# localHost9 — Project Report

## Overview
A cloud kitchen food ordering website for **localHost9** (localhost9.in). Built with Next.js, Supabase, and Google OAuth. Deployed on Vercel with near-zero monthly cost.

---

## Live URLs
- **Website**: https://localhost9.in (redirects to https://www.localhost9.in)
- **GitHub**: https://github.com/satyasharma/localhost9
- **Supabase Project**: dsorrxddwuzjwjfkwfew

---

## Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | Next.js 14 + Tailwind CSS + Lucide icons | Free |
| Hosting | Vercel (auto-deploy from GitHub) | Free |
| Database | Supabase PostgreSQL (free tier) | Free |
| Auth | Google OAuth (via Google Identity Services) | Free |
| Image Storage | Supabase Storage (public bucket) | Free |
| Domain | localhost9.in (GoDaddy) | ₹199/year |

---

## Authentication Flow

**Method**: Google OAuth via Google Identity Services (GIS)

**How it works**:
1. Google's `renderButton` is rendered hidden; a custom clean button triggers it
2. Google One Tap also fires automatically for users already signed into Chrome
3. On success, Google returns an ID token directly to the page (no redirect to Supabase URL)
4. Token is passed to `supabase.auth.signInWithIdToken()` with a SHA-256 hashed nonce
5. New users → "Complete Profile" screen asks for phone number
6. Returning users → straight to menu

**Key decisions**:
- Used GIS `renderButton` + `signInWithIdToken` instead of `signInWithOAuth` to avoid showing Supabase's gibberish URL on Google's consent page
- Nonce is generated client-side, hashed with SHA-256 for Google, raw nonce sent to Supabase for verification
- After selecting Google account, shows "Signing you in..." instead of flashing back to sign-in page

**Google Cloud Console config**:
- Project: localhost9
- OAuth Client ID: 1022788259741-i0rubqofu7kk7ta71v8eopshtsg2qnut.apps.googleusercontent.com
- Authorized JavaScript origins: https://localhost9.in, https://www.localhost9.in, https://dsorrxddwuzjwjfkwfew.supabase.co
- Authorized redirect URI: https://dsorrxddwuzjwjfkwfew.supabase.co/auth/v1/callback
- App is published (not in testing mode)

---

## Database Schema

### Tables

**users**
- id (uuid, PK, references auth.users)
- name (text)
- phone (text, nullable, NOT unique)
- email (text, nullable)
- created_at (timestamptz)

**user_addresses**
- id (uuid, PK)
- user_id (uuid, FK → users)
- label (text) — e.g., "Home", "Office"
- full_address (text)
- phone (text) — contact number for this address
- created_at (timestamptz)

**dishes**
- id (uuid, PK)
- name (text)
- description (text)
- price (decimal) — in Rupees
- image_url (text)
- category (text)
- available (boolean)
- created_at (timestamptz)

**orders**
- id (uuid, PK)
- display_order_id (text, auto-generated from sequence starting at 1001)
- user_id (uuid, FK → users, nullable)
- phone (text)
- delivery_address (text)
- total_amount (decimal)
- item_count (integer)
- summary_text (text) — e.g., "Coconut Laddoo ×2" for fast history display
- status (text) — pending, preparing, delivered, cancelled
- notes (text)
- created_at (timestamptz)

**order_items**
- id (uuid, PK)
- order_id (uuid, FK → orders)
- dish_id (uuid, FK → dishes)
- dish_name (text) — snapshot of name at order time
- quantity (integer)
- price (decimal)
- created_at (timestamptz)

### Sequences
- `order_number_seq` — starts at 1001, auto-increments for display_order_id

### Indexes
- `idx_orders_user_created` — orders(user_id, created_at DESC) for fast order history
- `idx_user_addresses_user` — user_addresses(user_id)
- `idx_order_items_order` — order_items(order_id)
- `idx_dishes_available` — dishes(available) WHERE available = true

### RLS Policies
- Users can only read/write their own profile, addresses, orders, and order items
- Dishes are publicly readable (available = true)
- All policies use `auth.uid()` for row-level security

### Storage
- Bucket: `images` (public)
- Dish images stored at: `https://dsorrxddwuzjwjfkwfew.supabase.co/storage/v1/object/public/images/`

---

## Current Menu
| Dish | Price | Image |
|------|-------|-------|
| Coconut Laddoo | ₹200 | coconut-laddoo.jpg in Supabase storage |

---

## UI Components

| Component | File | Purpose |
|-----------|------|---------|
| AuthScreen | src/components/AuthScreen.tsx | Google sign-in button (GIS renderButton + One Tap) |
| CompleteProfile | src/components/CompleteProfile.tsx | New user phone number collection |
| Menu | src/components/Menu.tsx | Dish grid with add/quantity controls |
| Cart | src/components/Cart.tsx | Slide-in drawer from right |
| OrderForm | src/components/OrderForm.tsx | Checkout: saved addresses, phone, notes |
| OrderConfirmation | src/components/OrderConfirmation.tsx | Success modal with order number |
| Sidebar | src/components/Sidebar.tsx | User profile, accordion order history, logout |

---

## User Flow

1. **Sign in** → Google button → One Tap popup (or Google consent page as fallback)
2. **New user** → asks for phone number → creates profile
3. **Menu** → see dishes, add to cart with +/- controls
4. **Cart** → slide-in drawer, adjust quantities, proceed to checkout
5. **Checkout** → select saved address or add new (with phone per address), special instructions
6. **Order placed** → confirmation with order number (#1001, #1002...), copy button
7. **Sidebar** → user initial avatar (top-left), shows name/phone, accordion order history, logout

---

## Order ID Generation
- Sequential numbers from database sequence (1001, 1002, 1003...)
- Auto-generated by PostgreSQL `nextval('order_number_seq')`
- Stored in `display_order_id` column
- Zero collision risk, easy to read over phone

---

## Key Design Decisions

1. **Phone per address, not per user** — allows different contact numbers for home/office/friend's place
2. **Phone NOT unique on users** — same person can have multiple Google accounts with same phone
3. **summary_text on orders** — avoids joining order_items + dishes for order history display
4. **dish_name snapshot in order_items** — history stays correct even if dish names change
5. **No WhatsApp/SMS OTP** — Google OAuth is free; WhatsApp OTP planned for later (~₹360/month at scale)
6. **No payment gateway yet** — COD only; Razorpay ready to add when needed
7. **Prices without .00** — shows ₹200 not ₹200.00 for whole amounts

---

## Environment Variables (Vercel)

| Variable | Purpose |
|----------|---------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anonymous key |
| SUPABASE_URL | Server-side Supabase URL |
| SUPABASE_ANON_KEY | Server-side Supabase key |
| NEXT_PUBLIC_GOOGLE_CLIENT_ID | Google OAuth client ID |

---

## DNS Configuration (GoDaddy)

| Type | Name | Value |
|------|------|-------|
| A | @ | 216.198.79.1 |
| CNAME | www | e1020fd80f995fb2.vercel-dns-017.com |

---

## Current Stats
- Users: 4
- Orders: 16
- Active dishes: 1
- Saved addresses: 8
- Order items: 16

---

## Future Roadmap (discussed but not built)
- WhatsApp OTP authentication (₹0.12/OTP via Meta Cloud API)
- Razorpay payment integration (2% per transaction)
- More menu items
- Order status updates
- Admin dashboard for managing orders
