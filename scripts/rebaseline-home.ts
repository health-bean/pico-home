// Re-dates a home's tasks as if it had just finished onboarding today, using
// the current first-week rules (starters due today, quiet first 14 days,
// seasonal spread). For testers who want to see the fresh-login experience
// without losing their home, members, or history.
//
// - Tasks with a real completion keep their dates (that history is true).
// - Never-completed template tasks get today's starter/initial due date.
// - Custom tasks and anything not matching a template are left alone.
// - The stored maintenance score is recalculated.
//
// Dry run by default (prints the plan, writes nothing):
//   npx tsx scripts/rebaseline-home.ts "Bunker Hill"
// Write it:
//   npx tsx scripts/rebaseline-home.ts "Bunker Hill" --apply
import fs from "node:fs";
import pg from "pg";
import { TASK_TEMPLATES, type FrequencyUnit } from "../src/lib/tasks/templates";
import { getInitialDueDate, selectStarterTemplates } from "../src/lib/tasks/initial-due";
import { calculateHomeHealthScore } from "../src/lib/tasks/scheduling";

const homeName = process.argv[2];
const apply = process.argv.includes("--apply");
if (!homeName || homeName.startsWith("--")) {
  console.error('Usage: npx tsx scripts/rebaseline-home.ts "<home name>" [--apply]');
  process.exit(1);
}

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const client = new pg.Client({
  connectionString: match[1].trim().replace(/^"|"$/g, ""),
  ssl: { rejectUnauthorized: false },
});

const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const now = new Date();
const today = localIso(now);
const daysFromToday = (iso: string) =>
  Math.round((Date.parse(iso + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000);

function summarize(label: string, dates: string[]) {
  const d = dates.map(daysFromToday);
  const n = (f: (x: number) => boolean) => d.filter(f).length;
  console.log(
    `${label}: overdue ${n((x) => x < 0)} · today ${n((x) => x === 0)} · ` +
      `days 1–13 ${n((x) => x >= 1 && x <= 13)} · days 14–30 ${n((x) => x >= 14 && x <= 30)} · later ${n((x) => x > 30)}`
  );
}

async function main() {
  await client.connect();
  try {
    const homes = await client.query(`SELECT id, name FROM homes WHERE name = $1`, [homeName]);
    if (homes.rows.length !== 1) {
      throw new Error(`Expected exactly one home named "${homeName}", found ${homes.rows.length}`);
    }
    const homeId: string = homes.rows[0].id;

    const { rows: tasks } = await client.query(
      `SELECT id, name, priority, frequency_value, frequency_unit,
              to_char(next_due_date, 'YYYY-MM-DD') AS next_due_date,
              to_char(last_completed_date, 'YYYY-MM-DD') AS last_completed_date,
              is_custom
         FROM task_instances WHERE home_id = $1 AND is_active = true`,
      [homeId]
    );

    const byName = new Map(TASK_TEMPLATES.map((t) => [t.name, t]));
    const matched = tasks.filter((t) => !t.is_custom && byName.has(t.name));
    const starterNames = new Set(
      selectStarterTemplates(matched.map((t) => byName.get(t.name)!)).map((t) => t.name)
    );

    const changes: { id: string; name: string; from: string; to: string }[] = [];
    let keptCompleted = 0;
    let keptCustom = 0;
    const after = new Map<string, string>();
    for (const t of tasks) {
      after.set(t.id, t.next_due_date);
      const template = !t.is_custom ? byName.get(t.name) : undefined;
      if (!template) { keptCustom++; continue; }
      if (t.last_completed_date) { keptCompleted++; continue; }
      const to = starterNames.has(t.name)
        ? today
        : localIso(getInitialDueDate(template, t.frequency_value, t.frequency_unit as FrequencyUnit, now));
      after.set(t.id, to);
      if (to !== t.next_due_date) changes.push({ id: t.id, name: t.name, from: t.next_due_date, to });
    }

    console.log(`Home: ${homeName} — ${tasks.length} active tasks`);
    console.log(`Kept: ${keptCompleted} with real completions, ${keptCustom} custom/unmatched`);
    summarize("Before", tasks.map((t) => t.next_due_date));
    summarize("After ", [...after.values()]);
    console.log(`\n${changes.length} tasks re-dated:`);
    for (const c of [...changes].sort((a, b) => a.to.localeCompare(b.to))) {
      console.log(`  ${c.to}  (was ${c.from})  ${c.name}`);
    }

    if (!apply) {
      console.log("\nDry run — nothing written. Re-run with --apply to save.");
    } else {
      await client.query("BEGIN");
      for (const c of changes) {
        await client.query(
          `UPDATE task_instances SET next_due_date = $1, updated_at = now() WHERE id = $2`,
          [c.to, c.id]
        );
      }
      const score = calculateHomeHealthScore(
        tasks.map((t) => ({
          nextDueDate: new Date(after.get(t.id)! + "T00:00:00"),
          priority: t.priority,
          lastCompletedDate: t.last_completed_date ? new Date(t.last_completed_date) : null,
          isActive: true,
          frequencyValue: t.frequency_value,
          frequencyUnit: t.frequency_unit,
        }))
      );
      await client.query(`DELETE FROM home_health_scores WHERE home_id = $1`, [homeId]);
      await client.query(
        `INSERT INTO home_health_scores
           (home_id, score, critical_tasks_score, preventive_care_score, home_efficiency_score)
         VALUES ($1, $2, $3, $4, $5)`,
        [homeId, score.overall, score.criticalTasks, score.preventiveCare, score.homeEfficiency]
      );
      await client.query("COMMIT");
      console.log(`\nApplied. ${changes.length} tasks re-dated; score now ${score.overall}.`);
    }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
