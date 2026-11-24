"use client";

import { Bell, Plus, ShoppingBasket } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarStack } from "@/components/avatar/Avatar";
import { AvatarPicker, AvatarStage } from "@/components/avatar/AvatarPicker";
import { Logo } from "@/components/brand/Logo";
import {
  IllustrationBasket,
  IllustrationHome,
  IllustrationQuiet,
  IllustrationReceipt,
  IllustrationSettled,
} from "@/components/brand/Illustrations";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { AnimatedMoney } from "@/components/ui/Money";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { AVATAR_KEYS, type AvatarKey } from "@/lib/avatars";

/** Design-system gallery: every token and primitive in one place, in both themes. */
export function DesignGallery() {
  const { preference, setPreference } = useTheme();
  const { toast } = useToast();
  const [avatar, setAvatar] = useState<AvatarKey>("fox");
  const [seg, setSeg] = useState("equal");
  const [sheet, setSheet] = useState(false);
  const [amount, setAmount] = useState(125000);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 px-5 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Logo />
        <Segmented
          label="Theme"
          value={preference}
          onChange={setPreference}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          className="w-64"
        />
      </header>

      <section className="space-y-4">
        <h2 className="font-display text-3xl font-semibold">Colour</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            ["canvas", "bg-canvas"], ["surface", "bg-surface"], ["surface-2", "bg-surface-2"], ["sunken", "bg-sunken"],
            ["line", "bg-line"], ["accent", "bg-accent"], ["accent-soft", "bg-accent-soft"], ["positive", "bg-positive"],
            ["positive-soft", "bg-positive-soft"], ["negative", "bg-negative"], ["negative-soft", "bg-negative-soft"], ["hilite", "bg-hilite"],
          ].map(([name, cls]) => (
            <div key={name} className="space-y-1.5">
              <div className={`h-14 rounded-xl border border-line ${cls}`} />
              <p className="text-xs text-ink-3">{name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl font-semibold">Type</h2>
        <p className="font-display text-6xl font-semibold tracking-tight">₹12,480</p>
        <p className="font-display text-3xl font-semibold">Yashwardhan owes you</p>
        <p className="text-base text-ink-2">Body text in Instrument Sans. Plain, legible, and quiet at small sizes. The quick brown fox jumps over 1,234.50 lazy dogs.</p>
        <p className="text-sm text-ink-3">Secondary text and captions, 4.5:1 contrast on the cream background.</p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl font-semibold">Buttons and fields</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Add expense</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete</Button>
          <Button loading>Saving</Button>
          <Button size="lg"><Plus className="size-5" /> Large action</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Description" placeholder="Milk and eggs" hint="What was it for?" />
          <Field label="Amount" defaultValue="abc" error="Enter a valid amount" />
        </div>
        <Segmented
          label="Split"
          value={seg}
          onChange={setSeg}
          options={[{ value: "equal", label: "Equal" }, { value: "amount", label: "Exact" }, { value: "percent", label: "Percent" }]}
          className="max-w-sm"
        />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl font-semibold">Avatars</h2>
        <div className="flex flex-wrap items-end gap-4">
          {AVATAR_KEYS.map((key) => (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <Avatar avatar={key} size={72} label={key} />
              <span className="text-xs text-ink-3">{key}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6">
          <Avatar avatar="chai" size={28} />
          <Avatar avatar="mango" size={36} />
          <Avatar avatar="moon" size={44} badge={<ShoppingBasket className="size-full p-0.5 text-accent" />} />
          <AvatarStack people={[{ avatar: "fox", name: "A" }, { avatar: "cat", name: "B" }]} size={44} />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <AvatarStage avatar={avatar} name="Akshat" />
          <AvatarPicker value={avatar} onChange={setAvatar} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl font-semibold">Illustrations and empty states</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-card border border-line bg-surface"><EmptyState illustration={<IllustrationSettled className="w-52" />} title="You two are all settled" description="No one owes anyone anything. Enjoy it." /></div>
          <div className="rounded-card border border-line bg-surface"><EmptyState illustration={<IllustrationBasket className="w-52" />} title="Looks like you're all stocked up" description="Nothing left to buy." action={<Button variant="soft">Add an item</Button>} /></div>
          <div className="rounded-card border border-line bg-surface"><EmptyState illustration={<IllustrationReceipt className="w-52" />} title="No expenses yet" description="Add the first one and it shows up here." /></div>
          <div className="rounded-card border border-line bg-surface"><EmptyState illustration={<IllustrationQuiet className="w-52" />} title="Nothing has happened yet" /></div>
          <div className="rounded-card border border-line bg-surface p-4 lg:col-span-2"><IllustrationHome className="mx-auto w-full max-w-md" /></div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl font-semibold">Motion and overlays</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setSheet(true)}>Open sheet</Button>
          <Button variant="secondary" onClick={() => toast({ title: "Expense added", description: "Groceries · ₹1,000" })}>Toast</Button>
          <Button variant="secondary" onClick={() => toast({ title: "Item removed", action: { label: "Undo", onClick: () => {} } })}>Toast with undo</Button>
          <Button variant="secondary" onClick={() => toast({ title: "Yashwardhan added Milk", leading: <Avatar avatar="fox" size={28} />, tone: "activity" })}>Activity toast</Button>
          <Button variant="ghost" onClick={() => setAmount((a) => (a === 125000 ? 30000 : 125000))}><Bell className="size-4" /> Animate amount</Button>
        </div>
        <p className="font-display text-5xl font-semibold"><AnimatedMoney paise={amount} /></p>
        <div className="max-w-md rounded-card border border-line bg-surface px-4">
          <SkeletonRow />
          <SkeletonRow />
        </div>
        <Skeleton className="h-24 max-w-md" />
      </section>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Record a payment" description="Drag the handle on a phone, or press Escape." footer={<Button full size="lg" onClick={() => setSheet(false)}>Save payment</Button>}>
        <div className="space-y-4">
          <Field label="Amount (₹)" placeholder="0.00" />
          <Field label="UPI reference" placeholder="Optional" />
        </div>
      </Sheet>
    </main>
  );
}
