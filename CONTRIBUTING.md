# Contributing to Chai Bill

Thank you for wanting to help. Chai Bill is a small, carefully built app, and it gets better with more
eyes on it. Bug reports, design feedback, translations, tests, docs and code are all welcome.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md), and that your contributions
are released under the project's [MIT license](LICENSE).

## Ways to help

- **Report a bug.** Open an issue with steps to reproduce, what you expected, and what happened.
  Screenshots help. Never include real financial details or credentials.
- **Suggest an idea.** Open an issue describing the problem you're trying to solve before the solution.
- **Improve the docs, copy or design.** Small things count: a clearer sentence, a better empty state, a
  contrast fix.
- **Fix something.** Look for issues labelled *good first issue*, or the ideas list in the
  [README](README.md#ideas-to-pick-up).

For anything bigger than a small fix, please **open an issue first** so we can agree on the approach. It
saves you building something we'd have to ask you to change.

## Setting up

Follow [Getting started](README.md#getting-started) in the README. In short: Node 20+, Docker and the
Supabase CLI, then `npm install`, `supabase start`, fill in `.env.local`, and `npm run dev`.

Sign in with different emails to play the flatmates (two is enough for most work), and read the emails in the local inbox at
http://127.0.0.1:54324. Raise the local auth rate limits in `supabase/config.toml` while you develop
(see the README note) but **don't commit that change**.

## The workflow

1. Fork the repository and create a branch from `main`: `feat/short-description`, `fix/short-description`,
   `docs/...`, or `test/...`.
2. Make your change in small, focused commits.
3. Run the checks (below) and fix anything they find.
4. Push and open a pull request. Describe **what** changed and **why**, link the issue, and add screenshots
   for anything visual (phone width, and dark mode if it's affected).
5. A maintainer will review it. Expect a conversation: that's the process working, not a rejection.

**Commit messages** use a short prefix, as the history does: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
or `chore:`, then a clear sentence. For example: `fix: keep the odd paisa with the payer on 3-way splits`.

## Checks to run before opening a PR

```bash
npm run lint
npx tsc --noEmit
npm test
```

And, depending on what you touched:

| You changed | Also run |
| --- | --- |
| Anything in `supabase/` | The SQL tests (see the README's Testing section) |
| A user-facing flow | The relevant end-to-end spec: `npx playwright test e2e/expenses.spec.ts`, or `-g "part of a title"` |
| Layout or styling | Check phone width (360 to 430px), desktop, and dark mode, by eye and with `e2e/responsive.spec.ts` |

CI doesn't replace this yet, so please run them locally.

## Ground rules that keep Chai Bill correct

These matter more than style. A change that breaks one of them will be sent back, however nice it looks.

### Money
- **Integer paise, always.** No floats in storage, in the money engine, or when passing amounts around.
  Parse user input with `parseRupeesToPaise` and format with `formatINR` or `formatINRCompact`.
- **Money logic is pure and tested.** It lives in `src/lib/money` and the parsers under `src/lib/*/form.ts`,
  with no framework or database imports. Add a test for every new rule, including the awkward cases
  (one paisa, three people, huge totals).
- **Don't change the rounding rule** (leftover paise go to the payer) without an issue and a discussion.
- Anything that affects a balance is soft-deleted, never hard-deleted.

### Privacy and security
- **Security lives in Postgres**, not in the UI. If a rule matters (who can see or change what), it must be a
  row-level security policy or a database constraint, with the UI merely reflecting it.
- Enable RLS on every new table, add explicit policies, and revoke `anon`. Prefer an RPC for writes that
  must keep an invariant.
- **Every policy, function or trigger change needs a SQL test** in `supabase/tests` that proves the rule by
  trying to break it (see `rls.sql` for the pattern).
- Never expose another household's data, or a personal expense, even "just in the UI".

### Database changes
- **Never edit a migration that has already been applied or merged.** Add a new file instead:
  `supabase/migrations/<YYYYMMDDHHMMSS>_short_name.sql`, then `supabase migration up`.
- Keep migrations additive and safe to read. Explain *why* in a comment at the top.
- Update [`docs/SPEC.md`](docs/SPEC.md) if the data model or a rule changes.

### Code
- TypeScript strict, no `any` unless a comment explains why.
- Server actions validate their input (Zod or the pure parsers) and return an `ActionResult`, so the UI can
  show a clear message.
- Code in `src/lib` that has unit tests **imports with relative paths** (not `@/...`), because Vitest doesn't
  read the path alias.
- Keep dependencies light. Adding one needs a reason in the PR.
- Don't commit secrets, `.env.local`, or real data. Screenshots must use made-up data.

### Design and accessibility
- Use the **design tokens** (`bg-surface`, `text-ink-2`, `border-line`, `bg-accent`...), not hard-coded
  colours. See [`docs/DESIGN.md`](docs/DESIGN.md).
- **Mobile first,** then check desktop. Nothing may scroll sideways at 360px.
- Check **dark mode.** Both themes are designed, not inverted.
- Interactive things need a real `<button>` or `<a>`, a label, a visible focus state, and a touch target of
  at least 44px. Don't rely on colour alone to carry meaning.
- Motion should explain a change, and must respect `prefers-reduced-motion`. A gesture (like swipe) always
  needs a visible button alternative.
- Overlays use the shared `Sheet`, toasts use `useToast`, and empty states use `EmptyState` with a real
  next step.

## Recipes

### Add an avatar
1. In `src/lib/avatars.ts`: add the key to `AVATAR_KEYS` and an entry in `AVATARS` (name, blurb, badge
   colours for light and dark, and the personal accent palettes).
2. In `src/components/avatar/AvatarArt.tsx`: draw the character on the 64×64 canvas, using the shared `Face`
   so it matches the family, and add a `case` in `AvatarArt`.
3. Add a **migration** that replaces the `profiles_avatar_key_check` constraint with the new list of keys.
   (The database validates the key, so the app and the constraint must agree.)
4. Update `src/lib/avatars.test.ts` (it asserts the number of avatars and distinct accents) and check how the
   picker grid looks at 360px.

### Add an expense category
1. In `src/lib/categories.ts`: add the key to `CATEGORY_KEYS` and `CATEGORIES` (label and colour), and
   optionally some `HINTS` words for suggestions.
2. In `src/components/expenses/CategoryIcon.tsx`: add its icon to `CATEGORY_ICONS`.
3. Add a **migration** that replaces the `expenses_category_check` constraint with the new list.
4. Add cases to `src/lib/categories.test.ts`.

### Add a migration
Create the timestamped file, enable RLS and policies for any new table, add a SQL test, run
`supabase migration up` and the SQL suites, and describe the change in your PR.

## Reviews

We aim to be quick and kind. We may ask for smaller PRs, more tests, or a different approach: usually
because of the ground rules above. If you disagree, say so: good arguments change our minds.

Thanks again for helping make splitting the chai bill a little less awkward. ☕
