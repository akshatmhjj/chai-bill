# Chai Bill design system

Chai Bill is a home for the people who share a home, not a finance dashboard. The design aims for warm, personal and
quick: you should be able to add a chai bill in a few seconds, and opening the app should feel a little
like checking in on your nest.

A live reference of every token and component below is at `/design` when running locally
(`npm run dev`). It is hidden in production.

## Principles

1. **Mobile first.** The phone is the primary device. Thumb-reachable actions, a bottom bar with a
   raised "+", full-screen forms, bottom sheets. Desktop is designed separately, not stretched.
2. **Money is calm.** Amounts are large and in tabular figures. Colour carries meaning, never decoration:
   green means you are owed, clay means you owe, neutral means settled.
3. **People, not rows.** Every action shows who did it, with their avatar. Two avatars joined by a
   flowing arrow are the balance.
4. **Motion has a job.** Things animate to show what changed (a new row easing in, a balance counting to
   its new value, an item springing into "bought"), never to decorate. Everything respects
   `prefers-reduced-motion`.
5. **Real changes feel real.** Realtime updates are announced (a toast with the housemate's avatar), shown
   (a brief glow on what changed) and counted (an unread badge that is exactly right).

## Colour

Tokens are CSS variables in `src/app/globals.css`, surfaced as Tailwind colours (`bg-surface`,
`text-ink-2`, `border-line`).

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| `canvas` | `#fbf7f0` cream | `#17110d` espresso | Page background |
| `surface` / `surface-2` / `sunken` | white-cream steps | each a step lighter | Cards, inset areas |
| `ink` / `ink-2` / `ink-3` | `#2b2018` to `#7a6a5c` | `#f6ede1` to `#a39383` | Text. `ink-3` is 4.5:1 on canvas |
| `accent` | `#c4501a` chai terracotta | `#ee8a4c` | Primary actions |
| `positive` | `#2b7753` cardamom | `#62c595` | You are owed, bought, success |
| `negative` | `#b53f2f` clay | `#f2897a` | You owe, delete |
| `hilite` | `#fff0c4` | `#3b3016` | The glow on something a housemate just changed |

Dark mode is a layered espresso, not an inversion: each surface step is lighter than the one under it,
so elevation stays readable, and accents are re-tuned for contrast on dark.

**Personal accent.** Each avatar has its own colour (`personalStyle()` in `src/lib/avatars.ts`). It is
applied as `--me`, `--me-soft` and `--me-ink` on the signed-in shell, and used sparingly: the profile
banner, the avatar preview stage, "your share" figures. The product stays one brand; the personal accent
is a signature.

## Type

- **Fraunces** (display): headings, amounts and the wordmark. A soft, warm serif.
- **Figtree** (UI): everything else. Friendly and legible at small sizes.
- Money uses `tabular-nums lining-nums` so columns align and digits do not jump.
- Inputs are at least 16px, so iOS never zooms the page on focus.

## Shape and depth

Radii: controls 12px, cards 20px, sheets 28px, pills fully round. Shadows are two soft steps
(`shadow-soft`, `shadow-lift`) and used sparingly; borders do most of the separating. Large decorative
shapes are clipped with `overflow-clip` (not `hidden`), so focus or scrolling cannot shift a page sideways.

## Avatars

Ten characters on one face system (dot eyes, blush, a small mouth), so they read as a family: Chai,
Mango, Samosa, Monstera, Moon, Sunny, Cloud, Cat, Fox and Panda. The badge colour adapts to the theme
while the character stays vivid. The art is in `src/components/avatar/AvatarArt.tsx`.

Avatars appear wherever a person is identified: expense rows, the paid-by toggle, payment history, the
activity feed (with a small badge for the kind of event), shopping rows and the household card.

## Layout

- **Phone and tablet (under 1024px):** bottom bar (Home, Expenses, "+", Shopping, Activity). The "+"
  opens a sheet of quick actions. Profile is the avatar at the top right of each page. The expense form
  is full screen and hides the bar.
- **Desktop:** fixed sidebar with the household card, theme switch and profile; content in a centred
  column; Home becomes two columns (balance and expenses beside shopping and activity).

## Components

Reusable primitives live in `src/components/ui`: `Button`, `Field`, `AmountInput`, `Segmented`, `Sheet`
(bottom sheet on phones, dialog on desktop, with focus trap, Escape and focus return), `Toast`,
`Skeleton`, `EmptyState`, `Money` / `AnimatedMoney`, `AnimatedList`, `Confetti`.

Feature components keep their own identity: `BalanceHero`, `SettleSheet`, `ExpenseForm`, `ExpenseRow`,
`ShoppingList`, `ActivityFeed`, `AvatarPicker`.

## Motion

Built with `motion`. Springs for things you touch, short ease-outs for things that arrive.

| Moment | Motion |
| --- | --- |
| Screen change | 280ms fade and rise (`template.tsx`) |
| Sheet | Spring up; drag the handle down to dismiss |
| Balance changes | The amount counts to its new value (whole rupees while moving, exact at rest) |
| New or removed row | Height and opacity spring |
| Shopping item bought | Tick pops, row glides to "Bought" |
| Avatar chosen | Spring scale, the preview stage swaps and takes on that character's colour |
| A housemate's change | The changed row glows for about three seconds, plus a toast |
| Balance settled | A short confetti burst |

## Unread activity

"New since your last visit" is judged against a read marker stored per person
(`household_members.activity_seen_at`). Unread means: events by someone else, after the marker. The
marker only moves forward, to the timestamp of the newest event that was on screen, and only after the
feed has been visible for a couple of seconds. Your own actions are never unread for you.

## Accessibility

Contrast of body and secondary text is at least 4.5:1 in both themes. Controls are at least 44px. Sheets
and dialogs trap focus and return it. Segmented controls and avatar pickers are real radio groups with
arrow-key support. Colour is never the only signal (amounts say "owe" or "owed"). Motion is reduced for
people who ask for it. Touch gestures (swipe to remove a shopping item) always have a visible button too.
