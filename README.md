# Restaurant SaaS (starter)

Three folders: `backend` (Express + MongoDB, port 5000), `frontend` (public business landing page and customer storefront, port 3000), and `admin` (staff and super admin, port 3001).

## Deploy on Vercel

Create three separate Vercel projects from this repository:

1. **Backend:** set the root directory to `backend`. Configure `MONGO_URI`, `JWT_SECRET`, `SUPER_EMAIL`, `SUPER_PASSWORD`, and `CORS_ORIGINS` (the frontend and admin origins, comma-separated). Set `TRUST_PROXY=true` if you need Express to use Vercel's forwarded client IP. In Atlas Network Access, allow the backend's Vercel egress. Default Vercel egress is dynamic; use Static IPs or Secure Compute if Atlas needs stable allowlisted addresses.
2. **Frontend:** set the root directory to `frontend` and `NEXT_PUBLIC_API_URL` to the backend Vercel URL ending in `/api`. Set `NEXT_PUBLIC_PARTNER_EMAIL` and/or `NEXT_PUBLIC_PARTNER_WHATSAPP` if you want public contact links.
3. **Admin:** set the root directory to `admin`, `NEXT_PUBLIC_API_URL` to the backend URL ending in `/api`, and `NEXT_PUBLIC_STOREFRONT_URL` to the deployed frontend origin.

Add each variable in the corresponding Vercel project's environment settings, then redeploy.

## Run
1. `cd backend && npm i && cp .env.example .env`, then fill in MONGO_URI (Atlas), JWT_SECRET, SUPER_EMAIL, SUPER_PASSWORD
2. `npm run seed` (creates your super admin), then `npm run dev`
3. `cd ../admin && npm i && cp .env.local.example .env.local && npm run dev`
4. `cd ../frontend && npm i && cp .env.local.example .env.local && npm run dev`
5. Open http://localhost:3001/login and sign in as super admin, add a restaurant with slug `restaurant1`, and flip features on or off.
6. Store staff sign in at http://localhost:3001/restaurant1/login. Customers order at http://localhost:3000/restaurant1.

## Demo stores
After the backend MongoDB configuration is ready, run `cd backend` and `npm run seed:demo`. It creates or refreshes only the three script-managed demo stores and their demo records. Existing stores with any of the demo slugs are left untouched and cause the seed to stop unless they are marked as this script's demo data. The script also creates small local SVG illustrations under `frontend/public/demo/`.

Open the customer stores at:

- http://localhost:3000/kabab-house
- http://localhost:3000/sweet-crumbs
- http://localhost:3000/daily-fresh

Super admin login: http://localhost:3001/login. Store staff use their branded portal URLs below. All demo accounts use password `Demo123!`:

- Karachi Kabab House: http://localhost:3001/kabab-house (sign in at `/kabab-house/login`)
- Sweet Crumbs Bakery: http://localhost:3001/sweet-crumbs (sign in at `/sweet-crumbs/login`)
- Daily Fresh Mart: http://localhost:3001/daily-fresh (sign in at `/daily-fresh/login`)

- Karachi Kabab House owner: `owner@kabab-house.demo`; cashier: `cashier@kabab-house.demo`
- Sweet Crumbs Bakery owner: `owner@sweet-crumbs.demo`; cashier: `cashier@sweet-crumbs.demo`
- Daily Fresh Mart owner: `owner@daily-fresh.demo`; cashier: `cashier@daily-fresh.demo`

Owners can edit their storefront details under **Branding**, configure delivery areas and pickup branches under **Delivery & pickup**, and turn either checkout option on or off. Product images are optional and can use local paths such as `/demo/kabab-house/products/item.svg`.

## Public landing page and inquiries
The public business landing page is at http://localhost:3000. Copy `frontend/.env.local.example` to `frontend/.env.local` and set `NEXT_PUBLIC_PARTNER_EMAIL` and/or `NEXT_PUBLIC_PARTNER_WHATSAPP` to the contact details you want to publish. Use an international phone number for WhatsApp, with digits only (for example, `923001234567`). Restart the frontend after changing these values.

The inquiry form submits to the backend and saves the submission in MongoDB. Sign in as a super admin at http://localhost:3001 and open **Inquiries** to review it, update its status, or prefill **Create a store** with the business name and owner email. You still set the store slug and temporary owner password before creating the account. Direct email and WhatsApp links also appear if you configure those public contact details; the `NEXT_PUBLIC_` values are included in the website, so only put public contact details there.

If the backend is deployed behind one trusted reverse proxy, set `TRUST_PROXY=true` in the backend environment so inquiry rate limits use the visitor IP.

## Roles
super_admin, owner, manager, cashier, kitchen, rider. Edit permissions in `backend/src/middleware/auth.js`.

## Not built yet
Card payments (the toggle and option exist, but no gateway is connected), coupons, loyalty, reviews, QR tables, WebSockets, direct file uploads, reports.
