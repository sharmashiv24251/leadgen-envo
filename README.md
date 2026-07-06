This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Telegram bot

Webhook lives at `app/api/telegram/webhook/route.ts`. It reads `TG_BOT_TOKEN` and `APP_URL` from the environment — set both in Vercel's project env vars (never commit them).

Commands: `/generate_leads`, `/responded`, `/bounced`, `/help`. No login step; every command reads `lib/data.ts` directly.

> Telegram command names only allow `a-z0-9_` — no hyphens. A hyphenated name (e.g. `/generate-leads`) gets split by Telegram's client into a command entity plus trailing plain text, so tapping the highlighted part sends a broken command.

After deploying, register the webhook once (replace the token and set `APP_URL` to your deployed domain):

```bash
curl -X POST "https://api.telegram.org/bot$TG_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "'"$APP_URL"'/api/telegram/webhook"}'
```

Also register the command list so Telegram shows a `/` menu with descriptions instead of making users type blind:

```bash
curl -X POST "https://api.telegram.org/bot$TG_BOT_TOKEN/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{"commands": [
    {"command": "generate_leads", "description": "Prospects with drafted emails"},
    {"command": "responded", "description": "Prospects who replied"},
    {"command": "bounced", "description": "Prospects whose emails bounced"},
    {"command": "help", "description": "List available commands"}
  ]}'
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
