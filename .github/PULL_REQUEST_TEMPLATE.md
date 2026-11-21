## What and why

<!-- What does this change, and why? Link the issue: "Closes #123". -->

## How to check it

<!-- Steps a reviewer can follow. For visual changes, add screenshots (phone width, and dark mode if affected). Use made-up data only. -->

## Checklist

- [ ] `npm run lint`, `npx tsc --noEmit` and `npm test` pass
- [ ] I added or updated tests for what I changed
- [ ] If I touched `supabase/`: I added a **new** migration (didn't edit an old one) and the SQL tests pass
- [ ] If I changed a security rule (policy, function, trigger): a SQL test proves it
- [ ] Money stays in integer paise, and I didn't change the rounding rule
- [ ] UI changes use design tokens, work at 360px with no sideways scroll, and look right in dark mode
- [ ] Docs updated if behaviour or the data model changed (`README.md`, `docs/SPEC.md`, `docs/DESIGN.md`)
- [ ] No secrets, `.env.local`, or real data in the diff
