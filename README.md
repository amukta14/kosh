# Kosh

Fee ledger, parent portal and dues desk for a four-centre JEE/NEET coaching institute in Jaipur.

- Parents log in with their mobile number, see what is due in one glance, and pay through a link. Hindi and English.
- Reminders go out on their own before, on and after each due date, and stop the moment an instalment is paid.
- Accounts see dues across every centre and batch, match bank credits, export to Tally, and work refunds out under the published policy.
- A dropout-risk model opens counsellor call tasks. It never touches fees or messages parents.

Run it: see [deployment.md](deployment.md). Design and decisions: see the Technical Design Document in `docs/`.

```
src/domain   pure business rules (fees, refunds, risk, reminders, matching, GST, Tally, CSV). Fully unit tested.
src/server   database access, jobs, auth, payments. Server only.
src/app      Next.js routes: parent portal, pay links, staff desk, API routes.
tests/       Vitest
```
