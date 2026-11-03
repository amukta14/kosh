# Kosh: deployment

Kosh is a Next.js 15 app with a libSQL (SQLite) database. Locally the database is a file. In production it is a hosted libSQL database (Turso). Nothing else is needed: payments, SMS and WhatsApp are mocked inside the app.

## Run it locally

Needs Node.js 20 or newer (tested on Node 24) and npm.

```bash
git clone <repo-url> kosh && cd kosh
npm install
npm run setup     # writes .env.local with random secrets, creates local.db, loads demo data
npm run dev       # http://localhost:3000
```

Other commands:

```bash
npm test          # 62 unit tests: fees, refunds, risk, reminders, matching, GST, CSV, Tally, security
npm run typecheck
npm run db:seed   # wipe and reload the demo data (also available as "Reset" in the app)
npm run build && npm start   # production build
```

`npm run setup` never overwrites an existing `.env.local`.

## Demo logins

The demo starts on **Monday 2 November 2026**, the date that matches the sample data in the brief (Ishita 23 days overdue, Mohit due in 13 days).

| Role | Login | Notes |
| --- | --- | --- |
| Parent | Mobile **98290 00587** | Rakesh Sharma, father of Ishita Sharma (STU-0587). Part paid, 23 days overdue, flagged at risk. Hindi by default. Sees the DPDP consent screen on first login. |
| Parent | Mobile **98290 00412** | Kavita Meena, two children: Aarav (STU-0412, paid) and Diya (STU-0413, sibling discount). English. |
| Parent | Mobile **98290 00219** | Suresh Gurjar, father of Mohit (STU-0219), due in 13 days. |
| Accounts | **neha@companya.test** | Password `kosh-demo-2026` |
| Accounts | **ramesh@companya.test** | Password `kosh-demo-2026`. Use for maker-checker: he created the pending refund, so Neha can approve it. |
| Counsellor | **vikram@companya.test** | Password `kosh-demo-2026`. Sees only the call list. |

Parent login uses a one-time code. No SMS is sent in demo mode, so the code is shown on the screen.

These are demo accounts created by the seed script. They are not secrets and only exist when `DEMO_MODE=true` data is loaded.

### A five-minute tour

1. Log in as parent 98290 00587. Agree to consent. The first screen is the amount, due date and a pay button.
2. Tap pay, then pay in the test gateway. The receipt is issued and the reminders for that instalment are cancelled.
3. Log in as neha@companya.test. Press `/` and type "ishita" to open her ledger: the reminder trail now shows the remaining steps as stopped.
4. In the dark bar at the top, press **+1 week**. The daily jobs run for each day: reminders go out (see Reminders) and new counsellor calls may open.
5. Payments: type `FEE STU0587` as a bank narration to see an automatic match, or `school fees` to see it queued.
6. Refunds: open the pending refund and approve it (maker-checker), or start a new one from any student.
7. Log in as vikram@companya.test and mark a flag as a false flag.
8. **Reset** in the top bar puts everything back.

## How it is deployed

Target: **Vercel** for the app, **Turso** for the database. Both have free tiers that cover this demo.

1. Create a Turso database and a token:
   ```bash
   turso db create kosh
   turso db show kosh --url
   turso db tokens create kosh
   ```
2. Load the schema and demo data into it from your machine:
   ```bash
   DATABASE_URL=<libsql url> DATABASE_AUTH_TOKEN=<token> SESSION_SECRET=<same as Vercel> \
     npx tsx --conditions=react-server scripts/seed.ts
   ```
   `SESSION_SECRET` must match production because pay links inside seeded reminder messages are signed with it.
3. Import the GitHub repo in Vercel (framework preset: Next.js). Add the environment variables below. Deploy.
4. `vercel.json` registers a daily cron (03:00 UTC, 08:30 IST) that calls `/api/cron/daily` to send reminders and refresh risk flags. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.

Any Node host works the same way (`npm run build && npm start`). On a single server you can keep the SQLite file and set `DATABASE_URL=file:/data/kosh.db`.

## Environment variables

Names only. `.env.example` lists them; `npm run setup` fills them locally.

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:./local.db` locally, `libsql://...` for Turso |
| `DATABASE_AUTH_TOKEN` | production | Turso token. Empty for a local file |
| `SESSION_SECRET` | yes | 32+ characters. Signs session cookies, pay links, receipt links and OTP hashes |
| `GATEWAY_WEBHOOK_SECRET` | yes | 32+ characters. HMAC key for payment gateway callbacks |
| `CRON_SECRET` | yes | 32+ characters. Protects `/api/cron/daily` |
| `DEMO_MODE` | yes | `true` shows OTP codes on screen, the demo clock and the reviewer hints. Set `false` for a real launch |
| `APP_URL` | yes | Public base URL, used in pay links inside reminders, e.g. `https://kosh.example.com` |

No secrets are committed. `.env.local` and `*.db` are in `.gitignore`.

## Gateway webhook

`POST /api/gateway/webhook` with header `X-Signature: <hex HMAC-SHA256 of the raw body using GATEWAY_WEBHOOK_SECRET>` and body:

```json
{ "orderId": "order_...", "amount": 15000, "status": "success", "gatewayPaymentId": "pay_...", "paidOn": "2026-11-02" }
```

Unknown orders and amount mismatches go to the accounts queue instead of being marked paid. Repeated callbacks for the same order are ignored. The in-app test checkout uses this exact code path.
