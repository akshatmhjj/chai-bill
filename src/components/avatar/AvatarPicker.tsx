"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { AVATAR_KEYS, AVATARS, personalStyle, type AvatarKey } from "@/lib/avatars";
import { Avatar } from "./Avatar";

/**
 * The preview stage: a large animated avatar on a wash of that character's own colour.
 * Used when choosing an avatar and again at the top of the profile.
 */
export function AvatarStage({ avatar, name, size = 128 }: { avatar: AvatarKey; name?: string; size?: number }) {
  const meta = AVATARS[avatar];
  return (
    <div className="personal relative overflow-clip rounded-card bg-me-soft px-6 py-8 text-center" style={personalStyle(avatar)}>
      {/* Soft decorative shapes pick up the character's colour. */}
      <div aria-hidden className="absolute -left-10 -top-12 size-40 rounded-full bg-me/15" />
      <div aria-hidden className="absolute -bottom-14 -right-8 size-44 rounded-full bg-me/20" />
      <div className="relative flex flex-col items-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={avatar}
            initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
          >
            <Avatar avatar={avatar} size={size} animated ring="surface" className="shadow-lift" />
          </motion.div>
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${avatar}-${name ?? ""}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            className="mt-4"
          >
            <p className="font-display text-2xl font-semibold text-me-ink">{name?.trim() || meta.name}</p>
            <p className="text-sm text-me-ink/80">{name?.trim() ? `${meta.name} · ${meta.blurb}` : meta.blurb}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** A grid of the ten avatars. Selecting one springs, ticks and updates the preview immediately. */
export function AvatarPicker({
  value,
  onChange,
  name = "avatar",
}: {
  value: AvatarKey;
  onChange: (next: AvatarKey) => void;
  name?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Choose your avatar" className="grid grid-cols-5 gap-2.5 sm:gap-3">
      <input type="hidden" name={name} value={value} />
      {AVATAR_KEYS.map((key) => {
        const selected = key === value;
        return (
          <motion.button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${AVATARS[key].name}, ${AVATARS[key].blurb}`}
            onClick={() => onChange(key)}
            whileTap={{ scale: 0.88 }}
            whileHover={{ y: -2 }}
            animate={{ scale: selected ? 1.06 : 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className={`relative flex aspect-square items-center justify-center rounded-2xl p-1 transition-colors ${
              selected ? "bg-surface shadow-soft" : "hover:bg-surface/70"
            }`}
          >
            {selected && (
              <motion.span
                layoutId="avatar-selection-ring"
                className="absolute inset-0 rounded-2xl ring-2 ring-accent"
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
              />
            )}
            <Avatar avatar={key} size="fill" />
            {selected && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 600, damping: 20 }}
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-accent text-on-accent"
              >
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
