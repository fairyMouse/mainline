import { addDays, format } from "date-fns";
import { db } from "./db";

/*
 * 日程任务（日历＋待办），字段说明见 docs/data-model.md。
 * 日期与时间都按本机本地时间存成字符串，不做时区换算：
 *   start_date / end_date  YYYY-MM-DD，start_date 为空表示无日期
 *   start_time / end_time  HH:mm，start_time 为空表示全天
 */

export type Priority = 0 | 1 | 3 | 5; // 无 / 低 / 中 / 高，取值与滴答清单一致
export type TaskStatus = "open" | "done";

export type Task = {
  id: number;
  title: string;
  content: string;
  priority: Priority;
  startDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  repeatRule: string | null;
  repeatParentId: number | null;
  status: TaskStatus;
  completedAt: string | null;
  sortOrder: number;
  midItemId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskInput = {
  title?: string;
  content?: string;
  priority?: Priority;
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  repeatRule?: string | null;
  sortOrder?: number;
  midItemId?: number | null;
};

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    priority INTEGER NOT NULL DEFAULT 0 CHECK (priority IN (0, 1, 3, 5)),
    start_date TEXT,
    start_time TEXT,
    end_date TEXT,
    end_time TEXT,
    repeat_rule TEXT,
    repeat_parent_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
    completed_at TEXT,
    sort_order REAL NOT NULL DEFAULT 0,
    mid_item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS tasks_start_date ON tasks (start_date) WHERE deleted_at IS NULL;
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

/*
 * 表结构演进：新增字段时先改上面的 CREATE TABLE（新库直接建全），
 * 再在这里补一行 ensureColumn（老库补列）。不要删库，也不要改已有字段的含义。
 */
function ensureColumn(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn("tasks", "repeat_parent_id", "INTEGER REFERENCES tasks(id) ON DELETE SET NULL");

type Row = {
  id: number;
  title: string;
  content: string;
  priority: Priority;
  start_date: string | null;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  repeat_rule: string | null;
  repeat_parent_id: number | null;
  status: TaskStatus;
  completed_at: string | null;
  sort_order: number;
  mid_item_id: number | null;
  created_at: string;
  updated_at: string;
};

// node:sqlite 返回无原型对象，这里逐字段转成普通对象，才能传给客户端组件。
function toTask(r: Row): Task {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    priority: r.priority,
    startDate: r.start_date,
    startTime: r.start_time,
    endDate: r.end_date,
    endTime: r.end_time,
    repeatRule: r.repeat_rule,
    repeatParentId: r.repeat_parent_id,
    status: r.status,
    completedAt: r.completed_at,
    sortOrder: r.sort_order,
    midItemId: r.mid_item_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function today(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function shiftDate(date: string, days: number): string {
  return format(addDays(new Date(`${date}T00:00:00`), days), "yyyy-MM-dd");
}

const ORDER = "ORDER BY start_date IS NULL, start_date, start_time IS NOT NULL, start_time, priority DESC, sort_order, id";

export function listTasks(): Task[] {
  return (db.prepare(`SELECT * FROM tasks WHERE deleted_at IS NULL ${ORDER}`).all() as Row[]).map(
    toTask,
  );
}

/** 与 [from, to] 有交集的任务（含跨天任务），用于日历视图。两端都是 YYYY-MM-DD，闭区间。 */
export function listTasksInRange(from: string, to: string): Task[] {
  const rows = db
    .prepare(
      `SELECT * FROM tasks
       WHERE deleted_at IS NULL AND start_date IS NOT NULL
         AND start_date <= ? AND coalesce(end_date, start_date) >= ?
       ${ORDER}`,
    )
    .all(to, from) as Row[];
  return rows.map(toTask);
}

export function getTask(id: number): Task | null {
  const row = db.prepare("SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL").get(id) as
    | Row
    | undefined;
  return row ? toTask(row) : null;
}

const COLUMNS: Record<keyof TaskInput, string> = {
  title: "title",
  content: "content",
  priority: "priority",
  startDate: "start_date",
  startTime: "start_time",
  endDate: "end_date",
  endTime: "end_time",
  repeatRule: "repeat_rule",
  sortOrder: "sort_order",
  midItemId: "mid_item_id",
};

function normalize(input: TaskInput): TaskInput {
  const out = { ...input };
  if (out.title !== undefined) out.title = out.title.trim();
  // 没有日期就不会有时间和结束日期。
  if (out.startDate === null) {
    out.startTime = null;
    out.endDate = null;
    out.endTime = null;
  }
  return out;
}

export function createTask(input: TaskInput & { title: string }): Task {
  const fields = normalize(input);
  if (!fields.title) throw new Error("任务标题不能为空");
  const keys = Object.keys(fields) as (keyof TaskInput)[];
  const { id } = db
    .prepare(
      `INSERT INTO tasks (${keys.map((k) => COLUMNS[k]).join(", ")})
       VALUES (${keys.map(() => "?").join(", ")}) RETURNING id`,
    )
    .get(...keys.map((k) => fields[k] ?? null)) as { id: number };
  return getTask(id)!;
}

export function updateTask(id: number, input: TaskInput): Task | null {
  const fields = normalize(input);
  if (fields.title === "") delete fields.title;
  const keys = Object.keys(fields) as (keyof TaskInput)[];
  if (keys.length > 0) {
    db.prepare(
      `UPDATE tasks SET ${keys.map((k) => `${COLUMNS[k]} = ?`).join(", ")},
         updated_at = datetime('now', 'localtime')
       WHERE id = ? AND deleted_at IS NULL`,
    ).run(...keys.map((k) => fields[k] ?? null), id);
  }
  return getTask(id);
}

export function setTaskDone(id: number, done: boolean) {
  db.prepare(
    `UPDATE tasks SET status = ?, completed_at = ?, updated_at = datetime('now', 'localtime')
     WHERE id = ? AND deleted_at IS NULL`,
  ).run(done ? "done" : "open", done ? format(new Date(), "yyyy-MM-dd HH:mm:ss") : null, id);
}

/** 软删除，保留记录以便撤销。 */
export function deleteTask(id: number) {
  db.prepare("UPDATE tasks SET deleted_at = datetime('now', 'localtime') WHERE id = ?").run(id);
}

export function restoreTask(id: number) {
  db.prepare("UPDATE tasks SET deleted_at = NULL WHERE id = ?").run(id);
}

/** 「顺延」：把所有已过期且未完成的任务挪到 toDate，保留原有时间和时长。 */
export function postponeOverdue(toDate: string) {
  db.prepare(
    `UPDATE tasks SET
       end_date = CASE WHEN end_date IS NULL THEN NULL
                  ELSE date(?, '+' || (julianday(end_date) - julianday(start_date)) || ' days') END,
       start_date = ?,
       updated_at = datetime('now', 'localtime')
     WHERE deleted_at IS NULL AND status = 'open' AND repeat_rule IS NULL
       AND coalesce(end_date, start_date) < ?`,
  ).run(toDate, toDate, toDate);
}

export function getSetting<T>(key: string, fallback: T): T {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row ? (JSON.parse(row.value) as T) : fallback;
}

export function setSetting(key: string, value: unknown) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, JSON.stringify(value));
}
