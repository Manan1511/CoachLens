/** Median + IQR over a set of benchmark angle readings — the client-side
 *  half of the PRD's baseline workflow (POST /athletes/{id}/baseline only
 *  stores the numbers; computing them from 8-10 un-fatigued benchmark
 *  deliveries is explicitly a coach/UI step per the backend's own
 *  docstring). Uses the same linear-interpolation quantile method as
 *  numpy's default, so a baseline confirmed here matches what a coach
 *  cross-checking in a spreadsheet would get. */
function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function medianAndIqr(values: number[]): { median: number; iqr: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const median = quantile(sorted, 0.5);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  return { median, iqr: q3 - q1 };
}

export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDeg(value: number | null, digits = 1): string {
  return value === null ? '—' : `${value.toFixed(digits)}°`;
}
