# Chai Bill

Shared expenses, settlements, activity and a shopping list for two roommates in Bangalore.

Built to be used every day by the two people in the flat, and to show how a small money product
can be built carefully: integer money, row-level security enforced in Postgres, and realtime sync
that respects the same rules.

![Balances on a phone](docs/screenshots/balances.png)
![Expenses on a phone](docs/screenshots/expenses.png)

| Screen | Shows |
| --- | --- |
| `/household` | Flat setup, invite codes, members |
| `/expenses` | Shared and personal expenses, your share, edit and delete |
| `/expenses/new` | Add an expense, with a live split preview |
| `/balances` | Who owes whom, suggested payments, payment history |
| `/shopping` | Shared list, bought and put back |
| `/activity` | What changed, and when |

## What it does

- **Expenses.** Shared with the flat or personal. Split equally among chosen people, by exact
  amounts, or by percentage. The leftover paisa from a split goes to the payer.
- **Settlements.** Record a payment of any amount (partial payments are normal), by UPI with an
  optional reference, cash or other. Only the person who made a payment can delete it.
- **Realtime.** A change by one roommate appears on the other's open page within about a second.
- **Activity feed.** Written by database triggers, so every change is logged whichever screen made it.
- **Shopping list.** Add with a quantity, mark bought, put back, delete.

Currency is INR only. Budgets, bills, chores, analytics and receipt scanning are out of scope for v1.

## Architecture

```
Browser (Next.js client components)
   │  server actions and RSC reads         Realtime (postgres_changes, with the user's token)
   ▼                                              ▲
Next.js 15 App Router ── @supabase/ssr ──► Supabase
   │                                        ├─ Auth (magic link, PKCE)
   │ pure money engine (src/lib/money)      ├─ Postgres + row-level security
   │ pure form parsers (src/lib/*/form.ts)  ├─ triggers → activity_events
   ▼                                        └─ RPCs: create/join household, upsert_expense
```

- **Next.js 15 App Router with TypeScript and Tailwind.** Pages read data on the server; forms are
  server actions that validate with Zod before calling the database.
- **Supabase.** Auth, Postgres, Realtime. The schema is plain SQL under `supabase/migrations`; there is
  no ORM.
- **Pure logic in `src/lib`.** Money, splits, balances, form parsing and the activity wording have no
  framework or database imports, so they are unit tested directly. The client preview and the server
  save call the same parser, so the numbers shown are the numbers stored.

## Money rules

All money is an integer number of paise. There are no floats in storage or in the money engine.

- **Equal split.** Each person gets `floor(total / n)`. The remainder (0 to n-1 paise) goes to the payer.
- **Exact amounts.** Must sum to the total exactly. Nothing is rounded for you.
- **Percentages.** Stored as basis points (33.33% = 3333). Must sum to 10000. Each share is
  `floor(total × bp / 10000)` computed with BigInt, and the remainder goes to the payer.
- **Balances.** For each member: `paid − owed + sent − received`, over shared expenses and
  non-deleted settlements. Positive means the flat owes them. The nets always sum to zero (tested).
- **Settle-up plan.** A greedy match of the largest creditor with the largest debtor, with ties broken
  by id, so the same data always gives the same plan.
- **Overpayment** is allowed and flips the sign. The database does not reject it, because enforcing
  it would race with concurrent writes.
- Balances are always recomputed from rows. They are never stored as a running total.

## Data and security

Every table has row-level security enabled, and `anon` has no privileges. The rules live in Postgres,
so they hold whatever the UI does.

- A helper `is_household_member()` (SECURITY DEFINER) is used by every policy, which avoids recursive
  policy evaluation.
- Households and memberships are created only through RPCs. A two-member cap is enforced in
  `join_household()`. Invite codes are single use and expire after seven days.
- Personal expenses and their shares are visible only to their creator.
- Shared rows are readable and writable by members of that flat.
- A settlement can only be recorded by its payer, so one roommate cannot record a payment made by the
  other.
- Every expense must have shares that sum to its total. A deferred constraint trigger checks this at
  COMMIT, so a bad split cannot be saved even if one request writes it partially.
- Expenses are written with `upsert_expense()`, which replaces the shares in one transaction. Separate
  calls would fail the deferred check.
- The activity feed can be written only by triggers. Clients can read it, not write it.
- Nothing that affects a balance is hard-deleted. Expenses and settlements are soft-deleted.

## Running it locally

Requirements: Node 20+, Docker, and the Supabase CLI.

```bash
npm install
supabase start               # starts Postgres, Auth, Realtime and Mailpit in Docker
cp .env.example .env.local   # then set NEXT_PUBLIC_SUPABASE_ANON_KEY from `supabase status -o env`
npm run dev                  # http://localhost:3000
```

Sign-in emails are not sent anywhere real. Open the local inbox at http://127.0.0.1:54324 to click the
link.

## Tests

```bash
npm test                     # unit tests for the money engine, parsers and activity wording (Vitest)
psql "$DB_URL" -f supabase/tests/rls.sql                              # RLS and RPC checks
psql "$DB_URL" -f supabase/tests/rls_settlements_shopping.sql         # settlements, shopping, feed
psql "$DB_URL" -f supabase/tests/expense_rpc.sql                      # atomic expense writes
psql "$DB_URL" -f supabase/tests/commit_path.sql                      # deferred share check at COMMIT
npm run test:e2e             # end-to-end flows in Chromium (Playwright)
```

`$DB_URL` is the `DB_URL` printed by `supabase start`. The SQL scripts run in a transaction that is
rolled back or cleans up after itself. The end-to-end suite builds the app and runs it on port 3000,
then covers sign-in, creating a flat, expenses and their edits, balances and payments, the shopping
list, live updates between two browsers, and a phone-width check that no page scrolls sideways.

## Status

Milestones M0 to M6 are built. Deployment is not decided yet. Known gaps:

- If two people edit the same expense at the same moment, the last save wins. There is no conflict
  check yet.
- Expense edit history is not kept; the activity feed records that an edit happened.
- Only one household per user, and the two-member cap is enforced in the database.

## Repository layout

```
docs/SPEC.md                 product scope, money rules, data model, milestones
supabase/migrations/         schema, RLS, RPCs, triggers (applied in order)
supabase/tests/              SQL checks for RLS, RPCs and the commit path
src/lib/money/               money engine: parsing, splits, balances, settle-up, summary
src/lib/expenses/            expense form parser (shared by the preview and the save)
src/lib/settlements/         settlement form parser
src/lib/shopping/            shopping form parser
src/lib/activity/            feed wording
src/lib/validation/          Zod schemas for household and login forms
src/app/                     routes, server actions and client components
e2e/                         Playwright specs and helpers
```
