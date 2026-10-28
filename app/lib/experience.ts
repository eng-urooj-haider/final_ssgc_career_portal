export type DateLike = Date | string | null | undefined;

function toDate(d: unknown): Date | null {
  if (!d) return null;
  const x = new Date(d as string | number | Date);
  return Number.isNaN(x.getTime()) ? null : x;
}

export function monthIndex(d: Date): number {
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

/** Distinct calendar months worked (overlaps not double counted). */
export function workedMonths(
  ranges: [DateLike, DateLike][],
  afterMonthIndex?: number,
): Set<number> {
  const set = new Set<number>();
  for (const [start, end] of ranges) {
    const s = toDate(start);
    if (!s) continue;
    const e = end ? toDate(end) : new Date();
    if (!e) continue;
    let from = monthIndex(s);
    const to = monthIndex(e);
    if (afterMonthIndex !== undefined) from = Math.max(from, afterMonthIndex + 1);
    for (let m = from; m <= to; m++) set.add(m);
  }
  return set;
}

/** "2y 3m" style, used in the PDF. */
export function fmtMonths(total: number): string {
  if (total <= 0) return "-";
  const years = Math.floor(total / 12);
  const months = total % 12;
  if (years === 0) return `${months}m`;
  return months > 0 ? `${years}y ${months}m` : `${years}y`;
}

/** "2 Years, 3 Months" style, used on the confirm page. */
export function fmtMonthsLong(total: number): string {
  if (total <= 0) return "";
  const years = Math.floor(total / 12);
  const months = total % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} Year${years === 1 ? "" : "s"}`);
  if (months > 0) parts.push(`${months} Month${months === 1 ? "" : "s"}`);
  return parts.join(", ");
}