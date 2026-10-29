/** Task search: every word must appear somewhere; name matches rank first. */

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // "A/C" → "ac", drops & ( ) etc.
    .replace(/\s+/g, " ")
    .trim();

export function searchTasks<T extends { name: string; description?: string | null }>(
  items: T[],
  query: string,
  /** Extra searchable text per item, e.g. category and appliance labels. */
  extra: (item: T) => string = () => ""
): T[] {
  const q = normalize(query);
  if (!q) return [];
  const words = q.split(" ");

  const scored: { item: T; score: number; i: number }[] = [];
  items.forEach((item, i) => {
    const name = normalize(item.name);
    const haystack = `${name} ${normalize(extra(item))} ${normalize(item.description ?? "")}`;
    if (!words.every((w) => haystack.includes(w))) return;

    const inName = words.filter((w) => name.includes(w)).length;
    const score =
      (name.startsWith(q) ? 4 : 0) +
      (inName === words.length ? 2 : inName > 0 ? 1 : 0);
    scored.push({ item, score, i });
  });

  return scored.sort((a, b) => b.score - a.score || a.i - b.i).map((s) => s.item);
}
