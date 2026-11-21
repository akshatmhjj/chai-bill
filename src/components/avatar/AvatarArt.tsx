import type { AvatarKey } from "@/lib/avatars";

/**
 * Character art for the ten avatars, drawn on a 64x64 canvas. Every character shares the same
 * face system (dot eyes, soft blush, a small mouth) so the set feels art-directed rather than mixed.
 * Steam on the chai cup only animates when `animated` is set, so lists of avatars stay calm.
 */

const INK = "#3a2a22";
const BLUSH = "#f4a58c";

type Mouth = "smile" | "grin" | "o" | "none";

function Face({
  cx,
  cy,
  s = 1,
  mouth = "smile",
  sleepy = false,
  ink = INK,
  blush = BLUSH,
}: {
  cx: number;
  cy: number;
  s?: number;
  mouth?: Mouth;
  sleepy?: boolean;
  ink?: string;
  blush?: string;
}) {
  const dx = 5.2 * s;
  return (
    <g>
      {sleepy ? (
        <>
          <path d={`M${cx - dx - 2 * s} ${cy}q${2 * s} ${2.2 * s} ${4 * s} 0`} stroke={ink} strokeWidth={1.5 * s} fill="none" strokeLinecap="round" />
          <path d={`M${cx + dx - 2 * s} ${cy}q${2 * s} ${2.2 * s} ${4 * s} 0`} stroke={ink} strokeWidth={1.5 * s} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx={cx - dx} cy={cy} rx={1.7 * s} ry={2.1 * s} fill={ink} />
          <ellipse cx={cx + dx} cy={cy} rx={1.7 * s} ry={2.1 * s} fill={ink} />
          <circle cx={cx - dx + 0.6 * s} cy={cy - 0.8 * s} r={0.55 * s} fill="#fff" opacity={0.9} />
          <circle cx={cx + dx + 0.6 * s} cy={cy - 0.8 * s} r={0.55 * s} fill="#fff" opacity={0.9} />
        </>
      )}
      <circle cx={cx - dx - 3.4 * s} cy={cy + 3.4 * s} r={2.3 * s} fill={blush} opacity={0.55} />
      <circle cx={cx + dx + 3.4 * s} cy={cy + 3.4 * s} r={2.3 * s} fill={blush} opacity={0.55} />
      {mouth === "smile" && (
        <path d={`M${cx - 2.6 * s} ${cy + 3.4 * s}q${2.6 * s} ${2.8 * s} ${5.2 * s} 0`} stroke={ink} strokeWidth={1.5 * s} fill="none" strokeLinecap="round" />
      )}
      {mouth === "grin" && <path d={`M${cx - 3 * s} ${cy + 3 * s}h${6 * s}a${3 * s} ${3 * s} 0 0 1-${6 * s} 0z`} fill={ink} />}
      {mouth === "o" && <ellipse cx={cx} cy={cy + 4.2 * s} rx={1.4 * s} ry={1.7 * s} fill={ink} />}
    </g>
  );
}

function Chai({ animated }: { animated?: boolean }) {
  const steam = animated ? "animate-steam" : "";
  return (
    <g>
      <path className={steam} d="M25 18c-2.4-2.4-2.4-5 0-7.6" stroke="#e7a56e" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity={animated ? undefined : 0.85} style={{ transformOrigin: "25px 14px" }} />
      <path className={steam} d="M32 16.5c-2.6-2.6-2.6-5.6 0-8.4" stroke="#e7a56e" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity={animated ? undefined : 0.85} style={{ animationDelay: "0.6s", transformOrigin: "32px 12px" }} />
      <path className={steam} d="M39 18c-2.4-2.4-2.4-5 0-7.6" stroke="#e7a56e" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity={animated ? undefined : 0.85} style={{ animationDelay: "1.2s", transformOrigin: "39px 14px" }} />
      <path d="M46 29h2.6a5.5 5.5 0 0 1 0 11H45" fill="none" stroke="#b5612f" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M14 24h34v10c0 10-7.5 18-17 18S14 44 14 34z" fill="#c9733f" />
      <ellipse cx="31" cy="24" rx="17" ry="4.4" fill="#f1be86" />
      <ellipse cx="31" cy="24" rx="17" ry="4.4" fill="none" stroke="#b5612f" strokeWidth="1.4" />
      <Face cx={31} cy={38} s={1.05} ink="#2a140b" blush="#f2b08a" />
    </g>
  );
}

function Mango() {
  return (
    <g>
      <ellipse cx="32" cy="38" rx="16.5" ry="19" transform="rotate(-16 32 38)" fill="#f2a20e" />
      <path d="M21.5 30c2.6-6.4 8.6-10 15-9" stroke="#f8c95a" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M34 19.5c.8-3 3.2-5 5.6-5.4" stroke="#6b4a2a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M37 17c4-6.4 12-6.6 15-2.6-4 5.6-11.4 6.6-15 2.6z" fill="#4e9a5b" />
      <path d="M40 16.6c3-1.4 6-2 9-1.6" stroke="#3a7a47" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Face cx={31} cy={40} />
    </g>
  );
}

function Samosa() {
  return (
    <g>
      <path d="M32 12L53 49H11z" fill="#d99a45" stroke="#d99a45" strokeWidth="6" strokeLinejoin="round" />
      <path d="M32 18.5L47 45H17z" fill="#e6b265" opacity="0.55" strokeLinejoin="round" />
      <path d="M15 50h34" stroke="#b87a2c" strokeWidth="2.4" strokeDasharray="2.6 2.6" strokeLinecap="round" />
      <Face cx={32} cy={38} s={1} ink="#3a2210" blush="#e98a6c" />
    </g>
  );
}

function Plant() {
  return (
    <g>
      <path d="M32 41C28 28 18 26 13 20c10.5-3.4 18 2 19 21z" fill="#4e9a5b" />
      <path d="M32 41C36 26 46 24 52 17c-12.5-2.4-20 5-20 24z" fill="#6db36f" />
      <path d="M32 41C30 30 31 21 33.4 11c5.4 8.6 4.4 19-1.4 30z" fill="#3f8650" />
      <path d="M19 41h26l-3.4 17H22.4z" fill="#d2693b" />
      <rect x="17.5" y="38" width="29" height="5.4" rx="2.7" fill="#e07c4d" />
      <Face cx={32} cy={49} s={0.82} ink="#3a1a0c" blush="#f2a48a" />
    </g>
  );
}

function Moon() {
  return (
    <g>
      <circle cx="30" cy="34" r="18" fill="#f7de8a" />
      {/* The carve-out uses the badge colour so it works in light and dark. */}
      <circle cx="42" cy="27" r="15.5" className="av-bg" />
      <path d="M49 43l1.3 3 3 1.3-3 1.3L49 51.6l-1.3-3-3-1.3 3-1.3z" fill="#fff8dc" />
      <path d="M44 16l.9 2.1 2.1.9-2.1.9L44 22l-.9-2.1-2.1-.9 2.1-.9z" fill="#fff8dc" />
      <Face cx={24.5} cy={37} s={0.78} sleepy ink="#4a3a14" blush="#f0a070" mouth="smile" />
    </g>
  );
}

function Sun() {
  const rays = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <g>
      {rays.map((angle) => (
        <line key={angle} x1="32" y1="9" x2="32" y2="14.5" stroke="#ffb020" strokeWidth="3.6" strokeLinecap="round" transform={`rotate(${angle} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="15" fill="#ffb020" />
      <circle cx="32" cy="32" r="15" fill="none" stroke="#ffc94d" strokeWidth="2" opacity="0.6" />
      <Face cx={32} cy={33} s={1} mouth="grin" ink="#4a2a08" blush="#ef7a4a" />
    </g>
  );
}

function Cloud() {
  return (
    <g>
      <ellipse cx="32.5" cy="46" rx="16" ry="2.6" fill="#8fbfe4" opacity="0.45" />
      <circle cx="21.5" cy="36" r="9.5" fill="#ffffff" />
      <circle cx="32" cy="29" r="12.5" fill="#ffffff" />
      <circle cx="43" cy="35" r="10" fill="#ffffff" />
      <rect x="21.5" y="35" width="21.5" height="11" rx="5.5" fill="#ffffff" />
      <path d="M49 14l1.1 2.5 2.5 1.1-2.5 1.1L49 21.2l-1.1-2.5-2.5-1.1 2.5-1.1z" fill="#ffffff" />
      <Face cx={32} cy={38} s={1} ink="#2f4a60" blush="#f4a0a0" />
    </g>
  );
}

function Cat() {
  return (
    <g>
      <path d="M14 31L16.5 11.5 31 22.5z" fill="#9b8ac0" />
      <path d="M50 31L47.5 11.5 33 22.5z" fill="#9b8ac0" />
      <path d="M19 25l1.2-8 7 5.4z" fill="#f2b3c4" />
      <path d="M45 25l-1.2-8-7 5.4z" fill="#f2b3c4" />
      <ellipse cx="32" cy="37" rx="19.5" ry="17" fill="#9b8ac0" />
      <path d="M32 21.5v5M27 22.6l1 4M37 22.6l-1 4" stroke="#7e6da6" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 39l7 1M11.5 43.4l6.6-1.6M53 39l-7 1M52.5 43.4l-6.6-1.6" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
      <Face cx={32} cy={37} s={1.02} mouth="none" ink="#2c2040" blush="#f4a0b8" />
      <path d="M30.2 40.4h3.6l-1.8 2.1z" fill="#f2a0b5" />
      <path d="M32 42.5v1.3M32 43.8c-1 1.5-2.7 1.5-3.5.4M32 43.8c1 1.5 2.7 1.5 3.5.4" stroke="#2c2040" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Fox() {
  return (
    <g>
      <path d="M12 32L14.5 10.5 30 23z" fill="#e8742c" />
      <path d="M52 32L49.5 10.5 34 23z" fill="#e8742c" />
      <path d="M17 26l1.3-9.4 7.4 6.2z" fill="#7a3a1a" />
      <path d="M47 26l-1.3-9.4-7.4 6.2z" fill="#7a3a1a" />
      <path d="M9.5 33c4-10 14-13 22.5-13s18.500 3 22.500 13c-1 12.500-10.500 22-22.500 22S10.500 45.500 9.500 33z" fill="#e8742c" />
      <path d="M9.800 34c6 1.500 14 7.500 22.200 17.500C40.200 41.500 48.200 35.500 54.200 34 52.500 46 43.500 54 32 54S11.500 46 9.800 34z" fill="#fff3e6" />
      <Face cx={32} cy={37} s={1} mouth="none" ink="#3a2018" blush="#f08a6a" />
      <ellipse cx="32" cy="45.500" rx="2.800" ry="2.100" fill="#3a2018" />
      <path d="M32 47.500v1.300M32 48.800c-1 1.400-2.600 1.400-3.400.4M32 48.800c1 1.400 2.600 1.400 3.400.4" stroke="#3a2018" strokeWidth="1.200" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Panda() {
  const dark = "#2e3a35";
  return (
    <g>
      <circle cx="18.500" cy="19" r="7.500" fill={dark} />
      <circle cx="45.500" cy="19" r="7.500" fill={dark} />
      <ellipse cx="32" cy="36" rx="19.500" ry="17.500" fill="#fffdf8" />
      <ellipse cx="24" cy="35" rx="5.200" ry="6.600" transform="rotate(-20 24 35)" fill={dark} />
      <ellipse cx="40" cy="35" rx="5.200" ry="6.600" transform="rotate(20 40 35)" fill={dark} />
      <circle cx="24.400" cy="34.200" r="1.900" fill="#ffffff" />
      <circle cx="39.600" cy="34.200" r="1.900" fill="#ffffff" />
      <circle cx="24.900" cy="33.700" r="0.7" fill={dark} />
      <circle cx="39.100" cy="33.700" r="0.7" fill={dark} />
      <circle cx="18.500" cy="43.500" r="2.400" fill={BLUSH} opacity="0.6" />
      <circle cx="45.500" cy="43.500" r="2.400" fill={BLUSH} opacity="0.6" />
      <ellipse cx="32" cy="42" rx="3.200" ry="2.300" fill={dark} />
      <path d="M28.800 45.500c1.600 2 5.800 2 7.400 0" stroke={dark} strokeWidth="1.500" fill="none" strokeLinecap="round" />
    </g>
  );
}

export function AvatarArt({ avatar, animated }: { avatar: AvatarKey; animated?: boolean }) {
  switch (avatar) {
    case "chai":
      return <Chai animated={animated} />;
    case "mango":
      return <Mango />;
    case "samosa":
      return <Samosa />;
    case "plant":
      return <Plant />;
    case "moon":
      return <Moon />;
    case "sun":
      return <Sun />;
    case "cloud":
      return <Cloud />;
    case "cat":
      return <Cat />;
    case "fox":
      return <Fox />;
    case "panda":
      return <Panda />;
  }
}
