"use client";

import { AnimatePresence, LayoutGroup, motion, type PanInfo } from "motion/react";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import {
  addShoppingItemAction,
  deleteShoppingItemAction,
  setShoppingBoughtAction,
} from "@/app/(app)/n/[nestId]/shopping/actions";
import { Avatar } from "@/components/avatar/Avatar";
import { IllustrationBasket } from "@/components/brand/Illustrations";
import { useLive } from "@/components/live/LiveProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useToast } from "@/components/ui/Toast";
import { useNestId } from "@/components/nest/NestContext";
import type { Member } from "@/lib/data/context";
import type { ShoppingItemView } from "@/lib/data/queries";
import { haptic } from "@/lib/haptics";

type OptimisticAction =
  | { type: "add"; item: ShoppingItemView }
  | { type: "bought"; id: string; bought: boolean; by: string }
  | { type: "remove"; id: string };

function reduce(state: ShoppingItemView[], action: OptimisticAction): ShoppingItemView[] {
  switch (action.type) {
    case "add":
      return [...state, action.item];
    case "remove":
      return state.filter((i) => i.id !== action.id);
    case "bought":
      return state.map((i) =>
        i.id === action.id
          ? { ...i, status: action.bought ? "bought" : "open", boughtBy: action.bought ? action.by : null, boughtAt: action.bought ? new Date().toISOString() : null }
          : i,
      );
  }
}

/**
 * The shared list. Every action updates the screen immediately (optimistically) and then settles with
 * the server. Tap the circle to buy, swipe a row to remove, and Undo from the toast if you slip.
 */
export function ShoppingList({ items, me, members, seenAt, focusAdd }: { items: ShoppingItemView[]; me: Member; members: Member[]; seenAt: string; focusAdd: boolean }) {
  const { toast } = useToast();
  const nestId = useNestId();
  const [optimistic, apply] = useOptimistic(items, reduce);
  const [, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [showAllBought, setShowAllBought] = useState(false);
  const [boughtOpen, setBoughtOpen] = useState(true);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusAdd) nameRef.current?.focus();
  }, [focusAdd]);

  const open = useMemo(() => optimistic.filter((i) => i.status === "open").sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [optimistic]);
  const bought = useMemo(() => optimistic.filter((i) => i.status === "bought").sort((a, b) => String(b.boughtAt).localeCompare(String(a.boughtAt))), [optimistic]);
  const total = open.length + bought.length;
  const shownBought = showAllBought ? bought : bought.slice(0, 6);

  function add(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const qty = quantity.trim();
    setName("");
    setQuantity("");
    haptic();
    nameRef.current?.focus();
    startTransition(async () => {
      apply({
        type: "add",
        item: { id: `tmp-${Date.now()}`, name: trimmed, quantity: qty || null, status: "open", addedBy: me.userId, boughtBy: null, createdAt: new Date().toISOString(), boughtAt: null },
      });
      const result = await addShoppingItemAction({ nestId, name: trimmed, quantity: qty });
      if (!result.ok) toast({ title: "Couldn't add that", description: result.error, tone: "error" });
    });
  }

  function setBought(item: ShoppingItemView, value: boolean, withUndo = true) {
    // A just-added item only has a temporary id until the server answers; it can't be changed yet.
    if (item.id.startsWith("tmp-")) return;
    haptic(value ? 12 : 6);
    startTransition(async () => {
      apply({ type: "bought", id: item.id, bought: value, by: me.userId });
      const result = await setShoppingBoughtAction(item.id, value);
      if (!result.ok) return toast({ title: "Couldn't update that", description: result.error, tone: "error" });
      if (value && withUndo) {
        toast({ title: `${item.name} bought`, action: { label: "Undo", onClick: () => setBought(item, false, false) } });
      }
    });
  }

  function remove(item: ShoppingItemView) {
    if (item.id.startsWith("tmp-")) return;
    haptic(10);
    startTransition(async () => {
      apply({ type: "remove", id: item.id });
      const result = await deleteShoppingItemAction(item.id);
      if (!result.ok) return toast({ title: "Couldn't remove that", description: result.error, tone: "error" });
      toast({
        title: `Removed ${item.name}`,
        action: {
          label: "Undo",
          onClick: () =>
            startTransition(async () => {
              // Show it straight back in the list, then let the server confirm.
              apply({
                type: "add",
                item: { id: `tmp-${Date.now()}`, name: item.name, quantity: item.quantity ?? null, status: "open", addedBy: me.userId, boughtBy: null, createdAt: new Date().toISOString(), boughtAt: null },
              });
              await addShoppingItemAction({ nestId, name: item.name, quantity: item.quantity ?? "" });
            }),
        },
      });
    });
  }

  const memberOf = (id: string | null) => members.find((m) => m.userId === id);

  return (
    <div className="flex flex-col gap-6">
      {/* Progress. */}
      {total > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-2xl font-semibold">
              {open.length === 0 ? "All done" : `${open.length} to buy`}
            </p>
            <p className="text-sm text-ink-3">
              {bought.length} of {total} picked up
            </p>
          </div>
          <div className="mt-3 h-2 overflow-clip rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={bought.length} aria-label="Items bought">
            <motion.div className="h-full rounded-full bg-positive" initial={false} animate={{ width: `${(bought.length / total) * 100}%` }} transition={{ type: "spring", stiffness: 140, damping: 22 }} />
          </div>
        </div>
      )}

      {/* Add bar. */}
      <form onSubmit={add} className="flex gap-2" aria-label="Add an item">
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add an item"
          aria-label="Item name"
          maxLength={120}
          autoComplete="off"
          enterKeyHint="done"
          className="h-12 min-w-0 flex-1 rounded-ctl border border-line bg-surface px-3.5 text-base outline-none transition-[border-color,box-shadow] placeholder:text-ink-3/70 focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Qty"
          aria-label="Quantity"
          maxLength={40}
          autoComplete="off"
          className="h-12 w-20 rounded-ctl border border-line bg-surface px-3 text-center text-base outline-none transition-[border-color,box-shadow] placeholder:text-ink-3/70 focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        <button
          type="submit"
          aria-label="Add to list"
          disabled={!name.trim()}
          className="flex size-12 shrink-0 items-center justify-center rounded-ctl bg-accent text-on-accent shadow-soft transition-[transform,opacity] active:scale-95 disabled:opacity-40"
        >
          <Plus className="size-6" strokeWidth={2.4} aria-hidden />
        </button>
      </form>

      <LayoutGroup>
        {/* To buy. */}
        {open.length === 0 && bought.length === 0 ? (
          <div className="rounded-card border border-line bg-surface">
            <EmptyState illustration={<IllustrationBasket className="w-52" />} title="Looks like you're all stocked up" description="Nothing on the list. Add something above and your housemates see it straight away." />
          </div>
        ) : (
          <section aria-label="To buy">
            {open.length === 0 ? (
              <div className="rounded-card border border-line bg-surface">
                <EmptyState illustration={<IllustrationBasket className="w-44" />} title="Everything's picked up" description="Nice. Anything new you add lands here." />
              </div>
            ) : (
              <ul className="divide-y divide-line overflow-clip rounded-card border border-line bg-surface shadow-soft">
                <AnimatePresence initial={false}>
                  {open.map((item) => (
                    <ItemRow key={item.id} item={item} person={memberOf(item.addedBy)} me={me.userId} isNew={item.addedBy !== me.userId && item.createdAt > seenAt} onToggle={() => setBought(item, true)} onRemove={() => remove(item)} />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </section>
        )}

        {/* Bought. */}
        {bought.length > 0 && (
          <section aria-label="Bought">
            <button type="button" onClick={() => setBoughtOpen((v) => !v)} aria-expanded={boughtOpen} className="mb-2 flex w-full items-center justify-between rounded-lg px-1 py-1 text-left">
              <h2 className="font-display text-xl font-semibold">Bought · {bought.length}</h2>
              <ChevronDown className={`size-5 text-ink-3 transition-transform ${boughtOpen ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {boughtOpen && (
              <>
                <ul className="divide-y divide-line overflow-clip rounded-card border border-line bg-surface">
                  <AnimatePresence initial={false}>
                    {shownBought.map((item) => (
                      <ItemRow key={item.id} item={item} person={memberOf(item.boughtBy)} me={me.userId} done onToggle={() => setBought(item, false, false)} onRemove={() => remove(item)} />
                    ))}
                  </AnimatePresence>
                </ul>
                {bought.length > 6 && (
                  <button type="button" onClick={() => setShowAllBought((v) => !v)} className="mt-2 w-full rounded-xl py-2 text-sm font-semibold text-accent hover:bg-accent-soft">
                    {showAllBought ? "Show fewer" : `Show all ${bought.length}`}
                  </button>
                )}
              </>
            )}
          </section>
        )}
      </LayoutGroup>
    </div>
  );
}

function ItemRow({
  item,
  person,
  me,
  isNew = false,
  done = false,
  onToggle,
  onRemove,
}: {
  item: ShoppingItemView;
  person: Member | undefined;
  me: string;
  isNew?: boolean;
  done?: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const { isFresh } = useLive();
  const pendingSave = item.id.startsWith("tmp-");

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -72 || info.velocity.x < -500) onRemove();
  }

  return (
    <motion.li
      layout="position"
      layoutId={item.id}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 420, damping: 38 }}
      className="relative overflow-clip"
    >
      {/* What a swipe reveals. */}
      <div aria-hidden className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-negative-soft text-negative">
        <Trash2 className="size-5" />
      </div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.5, right: 0 }}
        onDragEnd={onDragEnd}
        className={`relative flex touch-pan-y items-center gap-3 bg-surface px-4 py-3 ${pendingSave ? "opacity-70" : ""} ${isFresh(item.id) ? "animate-fresh" : ""}`}
      >
        <motion.button
          type="button"
          onClick={onToggle}
          disabled={pendingSave}
          whileTap={{ scale: 0.85 }}
          aria-label={done ? `Put back ${item.name}` : `Mark ${item.name} as bought`}
          className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${done ? "border-positive bg-positive text-on-accent" : "border-line-strong text-transparent hover:border-positive"}`}
        >
          <motion.span initial={false} animate={{ scale: done ? 1 : 0.4, opacity: done ? 1 : 0 }} transition={{ type: "spring", stiffness: 600, damping: 18 }}>
            <Check className="size-4" strokeWidth={3.5} aria-hidden />
          </motion.span>
        </motion.button>

        <div className="min-w-0 flex-1">
          <p className={`flex items-center gap-2 text-[17px] leading-snug transition-colors ${done ? "text-ink-3 line-through decoration-ink-3/50" : "font-semibold text-ink"}`}>
            <span className="truncate">{item.name}</span>
            {item.quantity && <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-xs font-semibold text-ink-2 no-underline">{item.quantity}</span>}
            {isNew && <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-accent">New</span>}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3">
            <Avatar avatar={person?.avatar} size={16} />
            {done ? (
              <span>
                bought by {person?.userId === me ? "you" : person?.name ?? "someone"} {item.boughtAt && <RelativeTime iso={item.boughtAt} />}
              </span>
            ) : (
              <span>
                added by {person?.userId === me ? "you" : person?.name ?? "someone"} <RelativeTime iso={item.createdAt} />
              </span>
            )}
          </p>
        </div>

        <button type="button" onClick={onRemove} disabled={pendingSave} aria-label={`Remove ${item.name}`} className="shrink-0 rounded-full p-2 text-ink-3 transition-colors hover:bg-negative-soft hover:text-negative active:scale-90 disabled:pointer-events-none disabled:opacity-40">
          <Trash2 className="size-[18px]" aria-hidden />
        </button>
      </motion.div>
    </motion.li>
  );
}
