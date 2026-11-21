/**
 * Small, consistent illustrations for empty and celebratory states. Everything is drawn with the
 * theme tokens, so each one adapts to light and dark. Steam and sparkles only move when `animated`.
 */

function Sparkle({ x, y, s = 1, delay = 0, animated }: { x: number; y: number; s?: number; delay?: number; animated?: boolean }) {
  return (
    <path
      d="M0-6c.6 3.4 2.6 5.4 6 6-3.4.6-5.4 2.6-6 6-.6-3.400-2.600-5.400-6-6 3.400-.6 5.400-2.600 6-6z"
      transform={`translate(${x} ${y}) scale(${s})`}
      className={`fill-accent ${animated ? "animate-shimmer" : ""}`}
      style={animated ? { animationDelay: `${delay}s` } : undefined}
    />
  );
}

function Steam({ x, y, animated, delay = 0 }: { x: number; y: number; animated?: boolean; delay?: number }) {
  return (
    <path
      d={`M${x} ${y}c-3-3-3-6 0-9`}
      fill="none"
      strokeWidth="3"
      strokeLinecap="round"
      className={`stroke-accent/50 ${animated ? "animate-steam" : ""}`}
      style={animated ? { animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` } : undefined}
    />
  );
}

/** Two cups clinking: "you two are all settled". */
export function IllustrationSettled({ animated = true, className = "" }: { animated?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} role="img" aria-label="Two cups clinking">
      <ellipse cx="100" cy="124" rx="70" ry="6" className="fill-line" />
      <g transform="rotate(9 70 108)">
        <path d="M40 58h56v18c0 17-12 30-28 30S40 93 40 76z" className="fill-accent" />
        <ellipse cx="68" cy="58" rx="28" ry="6.500" className="fill-accent-soft" />
        <path d="M40 66h-5a9 9 0 0 0 0 18h6" fill="none" strokeWidth="5" strokeLinecap="round" className="stroke-accent" />
        <Steam x={58} y={46} animated={animated} />
        <Steam x={72} y={44} animated={animated} delay={0.8} />
      </g>
      <g transform="rotate(-9 130 108)">
        <path d="M104 58h56v18c0 17-12 30-28 30s-28-13-28-30z" className="fill-positive" />
        <ellipse cx="132" cy="58" rx="28" ry="6.500" className="fill-positive-soft" />
        <path d="M160 66h5a9 9 0 0 1 0 18h-6" fill="none" strokeWidth="5" strokeLinecap="round" className="stroke-positive" />
        <Steam x={122} y={46} animated={animated} delay={0.4} />
        <Steam x={136} y={44} animated={animated} delay={1.2} />
      </g>
      <Sparkle x={100} y={40} s={1.3} animated={animated} />
      <Sparkle x={86} y={28} s={0.8} animated={animated} delay={0.5} />
      <Sparkle x={116} y={26} s={0.9} animated={animated} delay={1} />
      <circle cx="100" cy="64" r="2.600" className="fill-accent/60" />
    </svg>
  );
}

/** A basket of groceries: "looks like you are all stocked up". */
export function IllustrationBasket({ animated = true, className = "" }: { animated?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} role="img" aria-label="A basket of groceries">
      <ellipse cx="100" cy="127" rx="66" ry="6" className="fill-line" />
      {/* things in the basket */}
      <rect x="74" y="34" width="20" height="46" rx="6" fill="#f6f0e6" className="stroke-line-strong" strokeWidth="2" />
      <rect x="78" y="26" width="12" height="10" rx="3" className="fill-accent" />
      <rect x="78" y="50" width="12" height="14" rx="3" fill="#8fbfe4" />
      <ellipse cx="116" cy="58" rx="22" ry="16" transform="rotate(-18 116 58)" fill="#d99a45" />
      <path d="M100 52c6-4 14-4 20 0M104 62c6-3 12-3 18 0" stroke="#b87a2c" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="140" cy="64" r="12" className="fill-negative" />
      <path d="M140 52c0-5 4-8 8-8-1 5-4 8-8 8z" className="fill-positive" />
      <path d="M56 62c4-14 14-20 22-20-2 12-10 22-22 20z" className="fill-positive" />
      {/* basket */}
      <path d="M44 74h112l-10 44c-1 5-5 8-10 8H64c-5 0-9-3-10-8z" className="fill-sunken stroke-line-strong" strokeWidth="2" strokeLinejoin="round" />
      <path d="M52 92h96M56 108h88M78 74l4 52M100 74v52M122 74l-4 52" className="stroke-line-strong" strokeWidth="2" strokeLinecap="round" />
      <path d="M44 74h112" className="stroke-ink-3" strokeWidth="4" strokeLinecap="round" />
      <Sparkle x={160} y={36} s={1.2} animated={animated} />
      <Sparkle x={40} y={44} s={0.8} animated={animated} delay={0.7} />
    </svg>
  );
}

/** A receipt: "no expenses yet". */
export function IllustrationReceipt({ animated = true, className = "" }: { animated?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} role="img" aria-label="A blank receipt">
      <ellipse cx="100" cy="128" rx="60" ry="5" className="fill-line" />
      <g className={animated ? "animate-float" : ""}>
        <path d="M60 14h80v102l-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6z" className="fill-surface-2 stroke-line-strong" strokeWidth="2.500" strokeLinejoin="round" />
        <path d="M74 36h40M74 52h52M74 68h30" className="stroke-line-strong" strokeWidth="4" strokeLinecap="round" />
        <circle cx="126" cy="84" r="14" className="fill-accent" />
        <path d="M120 80h12M120 84h12M122 80c6 0 8 8 0 8" className="stroke-[var(--on-accent)]" strokeWidth="2.200" strokeLinecap="round" fill="none" />
      </g>
      <Sparkle x={160} y={30} s={1.1} animated={animated} />
      <Sparkle x={42} y={56} s={0.8} animated={animated} delay={0.8} />
    </svg>
  );
}

/** Two speech bubbles: "nothing has happened yet". */
export function IllustrationQuiet({ animated = true, className = "" }: { animated?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} role="img" aria-label="Two quiet speech bubbles">
      <ellipse cx="100" cy="128" rx="64" ry="5" className="fill-line" />
      <g className={animated ? "animate-float" : ""}>
        <path d="M36 30h70a12 12 0 0 1 12 12v22a12 12 0 0 1-12 12H72l-16 14V76H48a12 12 0 0 1-12-12z" className="fill-accent-soft" />
        <circle cx="62" cy="53" r="4" className="fill-accent" />
        <circle cx="76" cy="53" r="4" className="fill-accent" />
        <circle cx="90" cy="53" r="4" className="fill-accent" />
      </g>
      <g className={animated ? "animate-float" : ""} style={animated ? { animationDelay: "1.2s" } : undefined}>
        <path d="M94 66h70a12 12 0 0 1 12 12v18a12 12 0 0 1-12 12h-8v14l-16-14H94a12 12 0 0 1-12-12V78a12 12 0 0 1 12-12z" className="fill-positive-soft" />
        <path d="M100 84h46M100 96h28" className="stroke-positive" strokeWidth="4" strokeLinecap="round" />
      </g>
      <Sparkle x={150} y={34} s={1} animated={animated} />
    </svg>
  );
}

/** The sign-in hero: two mugs, a little plant, and a window of warm light. */
export function IllustrationHome({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 240" className={className} role="img" aria-label="Two mugs on a table next to a plant">
      <rect x="30" y="20" width="260" height="170" rx="24" className="fill-accent-soft" />
      <circle cx="240" cy="70" r="28" className="fill-accent/25" />
      <circle cx="240" cy="70" r="16" className="fill-accent/40" />
      <path d="M52 190V104l40-30v116z" className="fill-surface-2" opacity="0.7" />
      <rect x="22" y="190" width="276" height="10" rx="5" className="fill-line-strong" />
      <rect x="42" y="200" width="236" height="26" rx="8" className="fill-sunken" />
      {/* plant */}
      <path d="M62 190c-4-22-14-30-26-36 14-4 26 4 27 24z" className="fill-positive" />
      <path d="M62 190c5-26 18-34 32-40-16-4-30 6-31 26z" className="fill-positive/70" />
      <path d="M52 190h22l-3 22H55z" className="fill-accent" />
      {/* mug one */}
      <g>
        <path d="M118 128h52v22c0 16-11 28-26 28s-26-12-26-28z" className="fill-accent" />
        <ellipse cx="144" cy="128" rx="26" ry="6" className="fill-accent-soft" />
        <path d="M170 138h7a9 9 0 0 1 0 18h-8" fill="none" strokeWidth="5" strokeLinecap="round" className="stroke-accent" />
        <Steam x={134} y={116} animated />
        <Steam x={150} y={114} animated delay={0.9} />
      </g>
      {/* mug two */}
      <g>
        <path d="M200 140h48v20c0 14-10 26-24 26s-24-12-24-26z" className="fill-positive" />
        <ellipse cx="224" cy="140" rx="24" ry="5.500" className="fill-positive-soft" />
        <path d="M248 148h6a8 8 0 0 1 0 16h-7" fill="none" strokeWidth="4.500" strokeLinecap="round" className="stroke-positive" />
        <Steam x={216} y={128} animated delay={0.4} />
        <Steam x={232} y={126} animated delay={1.3} />
      </g>
      <Sparkle x={268} y={44} s={1.2} animated />
      <Sparkle x={96} y={50} s={0.9} animated delay={0.8} />
    </svg>
  );
}
