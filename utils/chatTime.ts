function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "2:30 PM" */
export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

/** "Today" / "Yesterday" / "12 Aug 2026" — used as sticky date separators. */
export function formatDateSeparator(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(d, now)) return "Today";
  if (isSameDay(d, yesterday)) return "Yesterday";

  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** "2:30 PM" today, "Yesterday" for yesterday, "12 Aug" otherwise — used in the contacts list preview. */
export function formatContactPreviewTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(d, now)) return formatMessageTime(iso);
  if (isSameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}