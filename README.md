# Khan G

Ek hi Node.js/Express website jisme aapki 10 tools combine hain:

| Tool | Route | Type |
|---|---|---|
| Ledger (invoice generator) | `/tools/ledger/` | Static, browser-only |
| Passvault (password generator) | `/tools/passvault/` | Static, browser-only |
| Wordcase (word/char counter) | `/tools/wordcase/` | Static, browser-only |
| Reamwork (PDF tools) | `/tools/reamwork/` | Static, browser-only |
| Inkling (AI writing assistant) | `/tools/inkling/` | Static UI + server API (needs AI provider key) |
| LinkHub (link-in-bio + shortener) | `/linkhub` | Full app — accounts, MongoDB, sessions |
| Booking Tool | `/tools/booking/` | Server API + SQLite |
| Countdown Maker | `/tools/countdown/` | Server API + SQLite |
| Digital Business Card | `/tools/card/` | Server API + SQLite |
| Expense Tracker | `/tools/expenses/` | Server API + SQLite |

The homepage (`/`) lists all 10 tools with SEO meta tags, `sitemap.xml`, and `robots.txt` already set up — you just need to replace `YOUR-DOMAIN-HERE.com` in those two files with your real domain once you have one.

## Run locally

```bash
npm install
cp .env.example .env      # then fill in the values you need (see below)
npm start                 # runs on http://localhost:3000
```

You do **not** need to fill in every value in `.env` to run the site — only the tool(s) that need them will fail to work until configured; everything else runs fine.

- **LinkHub** needs `MONGODB_URI` and `SESSION_SECRET`. Free MongoDB: [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier, a few minutes to set up).
- **Inkling** needs at least one of `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `GROQ_API_KEY` (whichever provider(s) you want to offer).
- Booking Tool, Countdown Maker, Digital Business Card, and Expense Tracker need nothing — they use local SQLite files created automatically in the `/data` folder.

## Where to deploy: Render, Vercel, or Netlify?

**Short answer: use Render.** Here's why, in plain terms:

Vercel and Netlify run your code as **serverless functions** — every request may spin up on a fresh, temporary machine that gets wiped afterwards. That's perfect for the purely static tools (Ledger, Passvault, Wordcase, Reamwork), but it breaks anything that needs to *remember* data on disk between requests — which is exactly what Booking Tool, Countdown Maker, Digital Business Card, and Expense Tracker do (they write to SQLite `.db` files). On Vercel/Netlify, those files would vanish after every request, so bookings, countdowns, cards, and expenses would never actually save.

**Render** runs your app as one continuous, always-on Node process (like a normal server), so:
- SQLite files stay on disk and persist.
- LinkHub's MongoDB connection and login sessions work exactly like on any normal host.
- Deployment is still just as simple as Vercel/Netlify — connect your GitHub repo and it builds automatically.

### Deploy on Render (recommended)

1. Push this folder to a GitHub repository.
2. Go to [render.com](https://render.com) → **New +** → **Web Service** → connect your repo.
3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (or paid for always-on, since the free tier sleeps after inactivity)
4. Under **Environment**, add the variables from `.env.example` (MONGODB_URI, SESSION_SECRET, and whichever AI keys you want).
5. **Important:** Render's free/starter disks are *ephemeral* on redeploys unless you add a **Persistent Disk** (Render dashboard → your service → Disks → Add Disk, mount it at `/data` or wherever `data/` resolves to inside the container). This keeps your SQLite files safe across deploys. Do this if Booking/Countdown/Card/Expenses data matters to you long-term — otherwise, for a quick launch, the default disk works fine until your next deploy.
6. Deploy. Render gives you a free `https://your-app.onrender.com` URL immediately; you can attach a custom domain later in the same dashboard.

### If you still want Vercel or Netlify

You can absolutely put the **static-only tools** there (Ledger, Passvault, Wordcase, Reamwork, and Inkling's front-end) as they need no server, and Inkling's `/tools/inkling/api/ai` route can be reimplemented as a proper Vercel/Netlify serverless function (the logic already exists in `routes/inkling.js`, ported almost line-for-line from your original Netlify function). But Booking Tool, Countdown Maker, Digital Business Card, Expense Tracker, and LinkHub genuinely need a real always-on server or an external database for every write — they are not a good fit for Vercel/Netlify without rewriting their storage to a hosted database (e.g., swapping SQLite for a hosted Postgres). If you want ONE single URL for everything (which is what you asked for), Render is the simplest way to get that today.

**Alternative to Render:** [Railway](https://railway.app) works the same way (always-on Node server, persistent volumes) if you want a second option to compare pricing/limits.

## Project structure

```
khang/
├── server.js              # main entry point — mounts every tool
├── package.json
├── .env.example
├── data/                  # SQLite files, created automatically
├── public/                # homepage + all static/browser-only tools
│   ├── index.html
│   ├── sitemap.xml / robots.txt
│   └── tools/{ledger,passvault,wordcase,reamwork,inkling,booking,countdown,card,expenses}/
├── routes/                 # Express API routers for the SQLite-backed tools + Inkling AI proxy
└── src/linkhub/            # LinkHub, mounted at /linkhub as its own Express sub-app
```

## Notes on monetization (since you mentioned earnings)

None of these tools currently have payment collection wired up — Inkling's landing page mentions a paid plan but the upgrade button is just a placeholder. To actually earn from this, you'd need to add a payment provider (Stripe is the standard choice) to gate Inkling's unlimited plan and/or LinkHub's premium features. I kept this out of the initial build since it's a separate decision (pricing, plan limits, etc.) — happy to add it once you decide on a plan.
