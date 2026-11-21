import { AVATARS, avatarOrDefault, type AvatarKey } from "@/lib/avatars";
import { AvatarArt } from "./AvatarArt";

interface AvatarProps {
  avatar: AvatarKey | string | null | undefined;
  /** Pixel size of the round badge, or "fill" to fill the parent (it stays square). */
  size?: number | "fill";
  /** "surface" separates overlapping avatars; "me" draws the person's own accent ring. */
  ring?: "none" | "surface" | "me";
  /** Steam and other idle movement. Only for large, single avatars. */
  animated?: boolean;
  /** A small overlay in the bottom-right corner, e.g. an activity-type icon. */
  badge?: React.ReactNode;
  /** Accessible name. Decorative when omitted (the name is usually shown next to it). */
  label?: string;
  className?: string;
}

const RING = {
  none: "",
  surface: "ring-2 ring-surface",
  me: "ring-2 ring-me ring-offset-2 ring-offset-surface",
};

export function Avatar({ avatar, size = 40, ring = "none", animated, badge, label, className = "" }: AvatarProps) {
  const key = avatarOrDefault(avatar);
  const meta = AVATARS[key];
  const fill = size === "fill";
  return (
    <span
      className={`relative inline-flex shrink-0 rounded-full ${fill ? "aspect-square w-full" : ""} ${RING[ring]} ${className}`}
      style={fill ? undefined : { width: size, height: size }}
    >
      <svg
        viewBox="0 0 64 64"
        width={fill ? undefined : size}
        height={fill ? undefined : size}
        className={`block overflow-hidden rounded-full ${fill ? "size-full" : ""}`}
        style={{ ["--av-l" as string]: meta.bg.light, ["--av-d" as string]: meta.bg.dark }}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      >
        <circle cx="32" cy="32" r="32" className="av-bg" />
        <AvatarArt avatar={key} animated={animated} />
      </svg>
      {badge && (
        <span className="absolute -bottom-1 -right-1 flex size-[45%] min-h-4 min-w-4 items-center justify-center rounded-full bg-surface text-ink shadow-soft ring-2 ring-surface">
          {badge}
        </span>
      )}
    </span>
  );
}

/** Two or more avatars overlapping, for "the household". */
export function AvatarStack({
  people,
  size = 36,
}: {
  people: { avatar: AvatarKey | string | null | undefined; name: string }[];
  size?: number;
}) {
  return (
    <span className="flex items-center" aria-label={people.map((p) => p.name).join(" and ")}>
      {people.map((person, index) => (
        <Avatar
          key={`${person.name}-${index}`}
          avatar={person.avatar}
          size={size}
          ring="surface"
          className={index > 0 ? "-ml-2.5" : ""}
        />
      ))}
    </span>
  );
}
