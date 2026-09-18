interface Groupable {
  subgroup: string | null;
  nextDueDate: string; // "YYYY-MM-DD"
}

/**
 * Groups tasks by subgroup (e.g. one group per appliance). Groups are ordered
 * by their soonest task, so whatever needs attention first leads; tasks within
 * a group are ordered by date. Tasks with no subgroup land in "other".
 */
export function groupBySubgroup<T extends Groupable>(
  tasks: T[]
): { key: string; tasks: T[] }[] {
  const map = new Map<string, T[]>();
  for (const task of tasks) {
    const key = task.subgroup || "other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(task);
  }

  // ISO dates compare correctly as strings
  const groups = [...map].map(([key, group]) => ({
    key,
    tasks: [...group].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)),
  }));

  return groups.sort(
    (a, b) =>
      a.tasks[0].nextDueDate.localeCompare(b.tasks[0].nextDueDate) ||
      a.key.localeCompare(b.key)
  );
}
