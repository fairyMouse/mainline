import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seed, seedDecision } from "./seed";

export type Layer = "direction" | "mid" | "short" | "explore" | "inbox";
// avoid / bet / alt 是决策表之前的旧写法，迁移后只保留 signal。
export type DirectionKind = "avoid" | "bet" | "alt" | "signal";
export type Status = "active" | "done" | "dropped";

export type Item = {
  id: number;
  layer: Layer;
  kind: DirectionKind | null;
  title: string;
  reason: string;
  importance: number; // 3 高 / 2 中 / 1 低
  status: Status;
  parentId: number | null;
  createdAt: string;
  doneAt: string | null;
};

const dataDir = path.join(process.cwd(), "data");

function open() {
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "mainline.db"));
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      layer TEXT NOT NULL,
      kind TEXT,
      title TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      importance INTEGER NOT NULL DEFAULT 2,
      status TEXT NOT NULL DEFAULT 'active',
      parent_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      done_at TEXT
    );
    CREATE TABLE IF NOT EXISTS decision (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      question TEXT NOT NULL,
      context TEXT NOT NULL DEFAULT '',
      weights_locked INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS criteria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      weight INTEGER NOT NULL DEFAULT 5,
      dropped INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      dropped INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS scores (
      option_id INTEGER NOT NULL REFERENCES options(id),
      criterion_id INTEGER NOT NULL REFERENCES criteria(id),
      score INTEGER,
      reason TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (option_id, criterion_id)
    );
  `);
  const { n } = db.prepare("SELECT count(*) AS n FROM items").get() as { n: number };
  if (n === 0) seed(db);
  if (!db.prepare("SELECT 1 FROM decision").get()) {
    seedDecision(db);
    // 长线的旧写法（方向／不想要的／备选）已并入决策表，原条目放下但保留记录。
    db.exec(
      "UPDATE items SET status = 'dropped' WHERE layer = 'direction' AND kind IN ('bet', 'avoid', 'alt')",
    );
  }
  return db;
}

const globalForDb = globalThis as unknown as { mainlineDb?: DatabaseSync };
export const db = globalForDb.mainlineDb ?? open();
globalForDb.mainlineDb = db;

type Row = {
  id: number;
  layer: Layer;
  kind: DirectionKind | null;
  title: string;
  reason: string;
  importance: number;
  status: Status;
  parent_id: number | null;
  created_at: string;
  done_at: string | null;
};

export function listItems(): Item[] {
  const rows = db
    .prepare("SELECT * FROM items WHERE status != 'dropped' ORDER BY importance DESC, id ASC")
    .all() as Row[];
  return rows.map((r) => ({
    id: r.id,
    layer: r.layer,
    kind: r.kind,
    title: r.title,
    reason: r.reason,
    importance: r.importance,
    status: r.status,
    parentId: r.parent_id,
    createdAt: r.created_at,
    doneAt: r.done_at,
  }));
}

export type Criterion = { id: number; title: string; note: string; weight: number };
export type Option = { id: number; title: string; note: string };
export type Score = { optionId: number; criterionId: number; score: number | null; reason: string };
export type Decision = {
  question: string;
  context: string;
  weightsLocked: boolean;
  criteria: Criterion[];
  options: Option[];
  scores: Score[];
};

export function getDecision(): Decision {
  const head = db.prepare("SELECT question, context, weights_locked FROM decision").get() as {
    question: string;
    context: string;
    weights_locked: number;
  };
  // node:sqlite 返回无原型对象，展开成普通对象才能传给客户端组件。
  const plain = <T,>(rows: unknown[]) => rows.map((r) => ({ ...(r as T) }));
  const criteria = plain<Criterion>(
    db.prepare("SELECT id, title, note, weight FROM criteria WHERE dropped = 0 ORDER BY id").all(),
  );
  const options = plain<Option>(
    db.prepare("SELECT id, title, note FROM options WHERE dropped = 0 ORDER BY id").all(),
  );
  const scores = plain<Score>(
    db
      .prepare(
        "SELECT option_id AS optionId, criterion_id AS criterionId, score, reason FROM scores",
      )
      .all(),
  );
  return {
    question: head.question,
    context: head.context,
    weightsLocked: head.weights_locked === 1,
    criteria,
    options,
    scores,
  };
}
