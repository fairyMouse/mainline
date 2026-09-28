import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seed } from "./seed";

export type Layer = "direction" | "mid" | "short" | "explore" | "inbox";
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
  `);
  const { n } = db.prepare("SELECT count(*) AS n FROM items").get() as { n: number };
  if (n === 0) seed(db);
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
