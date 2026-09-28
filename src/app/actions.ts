"use server";

import { revalidatePath } from "next/cache";
import { EXPLORE_LIMIT } from "@/lib/constants";
import { db, type DirectionKind, type Layer } from "@/lib/db";

function activeExploreCount() {
  const { n } = db
    .prepare("SELECT count(*) AS n FROM items WHERE layer = 'explore' AND status = 'active'")
    .get() as { n: number };
  return n;
}

export async function addItem(input: {
  layer: Layer;
  title: string;
  kind?: DirectionKind;
  parentId?: number | null;
}) {
  const title = input.title.trim();
  if (!title) return { error: "内容不能为空" };
  if (input.layer === "explore" && activeExploreCount() >= EXPLORE_LIMIT) {
    return { error: `探索最多同时 ${EXPLORE_LIMIT} 项，先完成或放下一项` };
  }
  db.prepare("INSERT INTO items (layer, kind, title, parent_id) VALUES (?, ?, ?, ?)").run(
    input.layer,
    input.kind ?? null,
    title,
    input.parentId ?? null,
  );
  revalidatePath("/");
  return {};
}

export async function updateItem(
  id: number,
  fields: { title?: string; reason?: string; importance?: number },
) {
  const current = db.prepare("SELECT title, reason, importance FROM items WHERE id = ?").get(id) as
    | { title: string; reason: string; importance: number }
    | undefined;
  if (!current) return;
  const title = fields.title?.trim() || current.title;
  const reason = fields.reason !== undefined ? fields.reason.trim() : current.reason;
  const importance = fields.importance ?? current.importance;
  db.prepare("UPDATE items SET title = ?, reason = ?, importance = ? WHERE id = ?").run(
    title,
    reason,
    importance,
    id,
  );
  revalidatePath("/");
}

export async function toggleDone(id: number) {
  db.prepare(
    `UPDATE items SET
       status = CASE status WHEN 'done' THEN 'active' ELSE 'done' END,
       done_at = CASE status WHEN 'done' THEN NULL ELSE datetime('now', 'localtime') END
     WHERE id = ?`,
  ).run(id);
  revalidatePath("/");
}

// 放下：不删除，保留记录，页面上不再显示。
export async function dropItem(id: number) {
  db.prepare("UPDATE items SET status = 'dropped' WHERE id = ?").run(id);
  revalidatePath("/");
}

// 收件箱里的想法归入某一层。
export async function moveItem(id: number, layer: Layer, parentId: number | null = null) {
  if (layer === "explore" && activeExploreCount() >= EXPLORE_LIMIT) {
    return { error: `探索最多同时 ${EXPLORE_LIMIT} 项，先完成或放下一项` };
  }
  db.prepare("UPDATE items SET layer = ?, parent_id = ? WHERE id = ?").run(layer, parentId, id);
  revalidatePath("/");
  return {};
}
