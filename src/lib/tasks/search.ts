/** Task search: every word must appear somewhere; name matches rank first. */

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // "A/C" → "ac", drops & ( ) etc.
    .replace(/\s+/g, " ")
    .trim();

/**
 * Light stemming so "cleaning", "cleaned" and "cleans" all search as
 * "clean". Only strips when a real word is left (3+ letters).
 */
export function stem(word: string): string {
  for (const suffix of ["ing", "ed", "es", "s"]) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      let base = word.slice(0, -suffix.length);
      // running → runn → run
      if ((suffix === "ing" || suffix === "ed") && /([b-df-hj-np-tv-z])\1$/.test(base)) {
        base = base.slice(0, -1);
      }
      return base;
    }
  }
  return word;
}

const queryWords = (query: string) => {
  const q = normalize(query);
  return q ? q.split(" ").map(stem) : [];
};

type Searchable = { name: string; description?: string | null };

const haystackFor = <T extends Searchable>(item: T, extra: (item: T) => string) =>
  `${normalize(item.name)} ${normalize(extra(item))} ${normalize(item.description ?? "")}`;

export function searchTasks<T extends Searchable>(
  items: T[],
  query: string,
  /** Extra searchable text per item, e.g. category and appliance labels. */
  extra: (item: T) => string = () => ""
): T[] {
  const words = queryWords(query);
  if (words.length === 0) return [];
  const q = words.join(" ");

  const scored: { item: T; score: number; i: number }[] = [];
  items.forEach((item, i) => {
    const name = normalize(item.name);
    if (!words.every((w) => haystackFor(item, extra).includes(w))) return;

    const inName = words.filter((w) => name.includes(w)).length;
    const score =
      (name.startsWith(q) ? 4 : 0) +
      (inName === words.length ? 2 : inName > 0 ? 1 : 0);
    scored.push({ item, score, i });
  });

  return scored.sort((a, b) => b.score - a.score || a.i - b.i).map((s) => s.item);
}

/**
 * When nothing matches every word: tasks matching some of them, most words
 * first. Words under 3 letters ("if", "a") don't count on their own.
 */
export function closeMatches<T extends Searchable>(
  items: T[],
  query: string,
  extra: (item: T) => string = () => "",
  limit = 5
): T[] {
  const words = queryWords(query).filter((w) => w.length >= 3);
  if (words.length === 0) return [];

  const scored: { item: T; hits: number; inName: number; i: number }[] = [];
  items.forEach((item, i) => {
    const hay = haystackFor(item, extra);
    const hits = words.filter((w) => hay.includes(w)).length;
    if (hits === 0) return;
    const name = normalize(item.name);
    scored.push({ item, hits, inName: words.filter((w) => name.includes(w)).length, i });
  });

  return scored
    .sort((a, b) => b.hits - a.hits || b.inName - a.inName || a.i - b.i)
    .slice(0, limit)
    .map((s) => s.item);
}
