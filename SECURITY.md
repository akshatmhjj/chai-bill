# Security policy

Chai Bill handles people's money and the private details of their homes, so we take security seriously.
The most important promise it makes is that **one household can never see another's data, and a personal
expense is never visible to a roommate.** Those rules live in Postgres row-level security.

## Reporting a vulnerability

**Please don't open a public issue for a security problem.**

Report it privately with GitHub's **"Report a vulnerability"** option under the repository's **Security**
tab (private vulnerability reporting). Include:

- what you found and where,
- the steps to reproduce it (a SQL snippet or a short script is ideal),
- what an attacker could do with it.

We'll acknowledge your report as soon as we can, keep you updated, and credit you in the fix if you'd like.
This is a volunteer project, so please be patient; we'll do our best to be quick on anything serious.

## What counts

Especially valuable:

- reading or changing another household's data,
- reading a personal expense that isn't yours,
- recording or deleting a payment on someone else's behalf,
- bypassing the two-person cap or reusing an invite code,
- anything that bypasses row-level security, or writes to the activity feed from a client,
- authentication or session problems.

## Please don't

- test against other people's data, or against any deployment you don't own,
- run denial-of-service tests,
- put real credentials or personal data in a report.

## Supported versions

Only the latest commit on `main` is supported.

## For contributors

Any change to `supabase/migrations` that touches a policy, a function or a trigger needs a SQL test under
`supabase/tests` that proves the rule holds. See [CONTRIBUTING.md](CONTRIBUTING.md).
