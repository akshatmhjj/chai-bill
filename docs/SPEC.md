# Chai Bill — Product & Technical Spec

Status: v1 draft (2026-11-20). Owner: Akshat.

Chai Bill is a shared-living and expense app for housemates in Bangalore: a nest holds up to 15 people (raised from two in M7). It is built to be used every day by the two of us, and to be a strong portfolio piece. It is deliberately not a generic split-bill app: it is opinionated about INR, UPI, and the rhythm of shared homes.

---

## 1. Product scope

### 1.1 In scope (v1, four pillars)

1. **Expenses** — personal and shared.
   - Each expense has a description, amount (INR), date, payer, and a split.
   - Split methods: `equal` (among chosen participants), `amount` (exact paise per person), `percent` (per-person percentage, in basis points).
   - Personal expenses are visible only to their creator and never affect shared balances.
2. **Settlements** — who owes whom, and how it was paid off.
   - Live balance per pair of household members, derived from expenses and settlements (never stored as a mutable number).
   - Partial payments are first-class: any amount, any number of times.
   - Each settlement records method (`upi`, `cash`, `other`), optional reference (e.g. UPI transaction ID), date, and note.
   - Full settlement history. Settlements are soft-deleted, never hard-deleted.
3. **Realtime sync and activity feed**
   - Changes made by one housemate appear on everyone's screen without a refresh (Supabase Realtime, filtered by `household_id`).
   - Activity feed records: expense created/edited/deleted, settlement recorded/deleted, shopping item added/bought.
4. **Shared shopping list**
   - Open and bought items, quantity text, who added it, who bought it.
   - Realtime like the rest of the household data.

### 1.2 Explicitly out of scope (v1)

- Budgets, recurring bills, rent tracking, chores.
- Analytics and charts beyond the balance view.
- OCR of receipts, AI features of any kind.
- Multi-currency. INR only.
- Native apps, push notifications, payments in-app (we only *record* UPI/cash, we never move money).

### 1.3 Users and roles

- A **user** is a Supabase Auth account.
- A **household** has members (two in v1). Every member is equal: either can add expenses, record settlements, and edit shopping items.
- A user can be in one household in v1.
- Personal data (personal expenses) belongs to its creator only.

### 1.4 Non-functional requirements

- **Money correctness is the product.** All money is integer paise. No floats in storage or in the money engine. Tests cover rounding.
- **Privacy by RLS.** Only household members can read or write household data. Personal rows are readable only by their creator. Enforced in Postgres, not just the UI.
- **Mobile-first UI.** Usable one-handed at 375px width.
- **Auditable.** Nothing that affects a balance is hard-deleted.

---

## 2. Money rules

### 2.1 Representation

- Currency: `INR` only. Column `currency` is constrained to `'INR'` so that adding another currency later is a deliberate migration.
- Storage: `bigint` paise (1 INR = 100 paise). Positive amounts are `> 0` for expenses and settlements; shares are `>= 0`.
- Input: the UI accepts a rupee string with at most two decimals (`"1234.5"`, `"1,234.50"` after stripping commas). `parseRupeesToPaise` converts to paise and rejects anything else.
- Display: `formatINR` uses `en-IN` grouping, e.g. `₹1,23,456.50`.

### 2.2 Splitting

Let `T` be the expense total in paise, `P` the payer, and `S` the set of participants.

**Equal split**
- `n = |S|`, `base = floor(T / n)`, `r = T - base * n` (so `0 <= r < n`).
- Every participant gets `base`.
- The leftover `r` paise goes to the **payer**: the payer's share is `base + r`.
- The payer must be one of the participants for equal splits. (If the payer is not sharing the cost, use a custom split with an explicit zero share.)

**Exact-amount split**
- Caller supplies a paise value per participant. Values must be integers `>= 0` and must sum to `T` exactly. No automatic rounding.

**Percentage split**
- Percentages are stored and computed in **basis points** (1% = 100 bp, so 33.33% = 3333 bp). The UI allows up to two decimals of percent.
- Basis points must be integers in `[0, 10000]` and must sum to exactly `10000`.
- Each share is `floor(T * bp / 10000)`. The remainder `T - Σ floor(...)` goes to the **payer**, as in equal split.
- The payer must be one of the participants.

**Invariants**
- `Σ share_paise == T` for every expense. Enforced in the database by a deferred constraint trigger, and tested in the money engine.
- Every expense has at least one share row.

### 2.3 Balances

For each household member `m`, across all non-deleted expenses `E` and settlements `X`:

```
paid(m)      = Σ T_e            for e in E where payer(e) = m
owed(m)      = Σ share_e(m)     for e in E
sent(m)      = Σ amt_x          for x in X where from(x) = m
received(m)  = Σ amt_x          for x in X where to(x) = m

net(m) = paid(m) - owed(m) + sent(m) - received(m)
```

- Positive `net(m)`: the household owes `m`.
- Negative `net(m)`: `m` owes the household.
- Invariant: `Σ net(m) = 0`. Tested.
- Personal expenses are excluded from household balances entirely.
- Balances are always computed from rows (in SQL view or in the money engine). Never stored as a mutable running total.

### 2.4 Settlement suggestions

- `settleUp(net)` returns a minimal-ish list of transfers `{from, to, amount}` that zero out all nets. Greedy: repeatedly match the largest debtor with the largest creditor, ties broken by user id so the output is deterministic.
- For two members this is always a single transfer, which is the common case.
- Overpayment is allowed: a settlement larger than the current amount owed simply flips the sign. The UI warns before saving, but the database does not reject it, because enforcing it would race with concurrent writes.

---

## 3. Data model (first release)

Full definition: [supabase/migrations/20261120000000_init_chai_bill.sql](../supabase/migrations/20261120000000_init_chai_bill.sql).

| Table | Purpose | Key constraints |
|---|---|---|
| `households` | A nest (one shared home). | `name` 1–60 chars. Created only via `create_household()` RPC. |
| `household_members` | Membership, display name. | PK `(household_id, user_id)`. |
| `household_invites` | Single-use join codes. | 7-day expiry, consumed by `join_household()`. |
| `expenses` | Personal or shared expense header. | `amount_paise > 0`, `currency = 'INR'`, scope/household/payer consistency checks, soft delete via `deleted_at`. |
| `expense_shares` | Per-person share of an expense. | `share_paise >= 0`, optional `basis_points`. Deferred trigger enforces sum = amount. |
| `settlements` | Payments between two members. | `amount_paise > 0`, `from_user <> to_user`, method enum, soft delete. |
| `shopping_items` | Shared shopping list. | `name` 1–120, status `open`/`bought`. |
| `activity_events` | Feed entries, written by triggers. | Append-only from clients. |

Enums: `expense_scope` (`personal`, `shared`), `split_method` (`equal`, `amount`, `percent`), `settlement_method` (`upi`, `cash`, `other`), `shopping_status` (`open`, `bought`).

### 3.1 Row-level security summary

- Every table has RLS enabled. `anon` has no privileges.
- `is_household_member(hid)` is a `SECURITY DEFINER` helper used by all policies. It avoids recursive policy evaluation.
- Households and memberships are created only through RPCs, so a user cannot create a household they are not in or add themselves to someone else's.
- Shared rows: readable and writable by members of the household.
- Personal expenses (and their shares): readable and writable only by the creator.
- Settlements: readable by members. Insert requires the creator to be a member and both parties to be members. Update (soft delete) is allowed to the creator only.
- Realtime uses the same RLS policies, so subscribers only receive rows they could read.

### 3.2 Activity feed

- Triggers on `expenses` (insert, soft delete), `settlements` (insert, soft delete), and `shopping_items` (insert, status change) write one `activity_events` row each, with actor `auth.uid()` and a short `payload` JSON.
- Clients read the feed; they never write it directly.

---

## 4. Architecture

- **Next.js 15 App Router** with TypeScript. Server Components for initial data, Client Components for interactive lists and realtime subscriptions.
- **Supabase**: Auth (email magic link in v1), Postgres with RLS, Realtime (`postgres_changes` on household-scoped tables).
- **Zod** at the boundaries (form input, route handlers, RPC payloads). The money engine itself trusts typed input and is pure.
- **Money engine** in `src/lib/money/` — pure functions, no I/O, no Supabase imports, fully unit tested with Vitest.
- **No ORM.** SQL migrations under `supabase/migrations/` are the schema source of truth.
- **Testing**: Vitest for the money engine and pure helpers. Playwright end-to-end in a later milestone, against a local Supabase.

### 4.1 Repository layout (target)

```
docs/SPEC.md
supabase/migrations/…init_chai_bill.sql
src/lib/money/            pure money engine (split, balances, settlements, format)
src/app/…                 routes and UI
```

---

## 5. Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | Foundation | Scaffold, this spec, initial migration, money engine with tests, `npm test` and `npm run build` pass. |
| M1 | Auth and household | Magic-link sign-in, `create_household` and `join_household` flows, invite code, two-member cap works end-to-end against local Supabase. |
| M2 | Expenses | Create/edit/delete shared and personal expenses with equal, exact and percent splits; split preview matches engine output. |
| M3 | Balances and settlements | Balance card per household, suggested transfers, record partial settlements (UPI/cash), settlement history, soft delete. |
| M4 | Realtime and activity feed | Changes from one device appear on the other without refresh; feed shows all event kinds. |
| M5 | Shopping list | Add, buy, un-buy, delete; realtime; feed entries. |
| M6 | Hardening and portfolio | Playwright E2E for the core flows, RLS tests proving cross-household and personal-data isolation, mobile polish, README with architecture notes and screenshots. |

Each milestone ends with `npm test`, `npm run build`, and a manual run on a phone-width viewport.

---

## 6. Open questions (not blocking M0)

- Magic link versus password for the two users — default is magic link.
- Whether an expense edit should keep a per-version history. Default for v1: no; the activity feed records that an edit happened.
- Hosting target for the demo (Vercel plus Supabase cloud) — decide before M6.

---

## 7. Redesign additions (M7)

A full UI/UX redesign (see [DESIGN.md](DESIGN.md)) added a small amount of product scope and data. Nothing
in sections 2 to 4 changed: the money rules, balance derivation and RLS model are as before.

### 7.1 Scope added

- **Nest size.** A nest holds up to **15 people** (`household_member_cap()`, migration `20261125000000`). Balances, settle-up and the feed work for any number of members. The settle-up screen shows what you owe or are owed by each person, using the suggested plan.
- **Profiles.** A name and one of ten avatars per person, chosen during onboarding and editable later.
  Shown wherever a person is identified. Each avatar also gives its owner a subtle personal accent colour.
- **Expense categories** (optional): groceries, food, rent, bills, travel, home stuff, fun, health, other.
  Suggested from the description, never required, and only about presentation.
- **Unread activity.** "New since your last visit", plus a badge on Activity.
- **"Expense edited" events** in the activity feed.
- **Appearance.** Light, dark or automatic, remembered on the device.
- **Quick actions** from anywhere on a phone: add an expense, record a payment, add a shopping item.

### 7.2 Data added

| Change | Detail |
| --- | --- |
| `profiles` | `user_id`, `display_name` (1 to 40), `avatar_key` (one of ten). Readable by the person and by people they share a nest with. Written only by `update_profile()`, which also updates their `household_members.display_name`. |
| `household_members.activity_seen_at` | The read marker. `mark_activity_seen(household, until)` moves it forward only, never into the future, for the caller only. |
| `expenses.category` | Optional, constrained to the nine keys. `upsert_expense()` takes it as a last, defaulted argument. |
| `activity_events.kind` | Adds `expense_edited`. Expense events also carry `category` and `paid_by` in their payload. |
| Realtime | `household_members` and `profiles` join the publication, so a roommate joining or changing their avatar appears live. |

### 7.3 Unread rule

An event is unread for a person when it was created by someone else and after their marker. The marker
moves to the timestamp of the newest event they were shown, after the feed has been on screen for a couple
of seconds. A person's own actions are never unread for them.

### 7.4 Routes

`/login`, `/onboarding/profile`, then `/` lists the person's nests (with `/nests/new` to make one and a code box to join one).
Inside a nest, everything lives under `/n/[nestId]`: `/` (home), `/expenses`, `/expenses/new`,
`/expenses/[id]/edit`, `/balances` (settle up), `/shopping`, `/activity`, `/invite` (short code, QR, refresh).
Join links are `/join/[code]`. `/profile` is the person's own page.

