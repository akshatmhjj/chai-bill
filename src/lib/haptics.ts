/** A tiny tap on phones that support it (mostly Android). Silently does nothing elsewhere. */
export function haptic(milliseconds = 8): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(milliseconds);
  } catch {
    // Vibration can be blocked by the browser; it is only a nicety.
  }
}
