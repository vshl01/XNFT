/**
 * Parse a short duration string ("15m", "7d", "30s", "12h") into seconds.
 * Used to keep JWT lifetimes, cookie max-age, and DB expiry in lockstep from a
 * single env value.
 */
const UNIT_SECONDS = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
} as const;

type Unit = keyof typeof UNIT_SECONDS;

export function durationToSeconds(value: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(value.trim());
  if (!match || match[1] === undefined || match[2] === undefined) {
    throw new Error(`Invalid duration string: "${value}" (expected e.g. "15m")`);
  }
  const amount = Number(match[1]);
  const unit = match[2] as Unit;
  return amount * UNIT_SECONDS[unit];
}
