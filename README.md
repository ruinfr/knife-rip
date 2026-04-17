# Arivix (`arivix.org`)

Next.js site for **Arivix** — Discord bot marketing, docs, dashboard, billing (Stripe), and Discord OAuth.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Share images

The app serves default share images at `/opengraph-image` and `/twitter-image` (see [`app/opengraph-image.tsx`](app/opengraph-image.tsx)). After deploying to **arivix.org**, refresh caches with:

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

## Environment

Copy [`.env.example`](.env.example) to `.env` and fill values. Highlights:

1. **Discord OAuth** — [Developer Portal](https://discord.com/developers/applications) → OAuth2 → Redirects:
   - `http://localhost:3000/api/auth/callback/discord` (local)
   - `https://arivix.org/api/auth/callback/discord` (production)

2. **Stripe** — **Developers → Webhooks** → endpoint `https://arivix.org/api/webhooks/stripe` (local: [Stripe CLI](https://stripe.com/docs/stripe-cli)) and set `STRIPE_WEBHOOK_SECRET`.

Use `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/arivix"` for local Postgres if you keep that database name (matches `docker-compose.yml`).
