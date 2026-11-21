/** What every server action hands back, so client screens can show success or an error. */
export type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}
