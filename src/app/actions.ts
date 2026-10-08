"use server";

import { revalidatePath } from "next/cache";
import { EXPLORE_LIMIT } from "@/lib/constants";
import { db, type DirectionKind, type Layer } from "@/lib/db";
import { SCORE_MAX, WEIGHT_MAX } from "@/lib/decision";

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

/* ——— 长线决策表 ——— */

function weightsLocked() {
  const row = db.prepare("SELECT weights_locked FROM decision").get() as { weights_locked: number };
  return row.weights_locked === 1;
}

export async function updateDecisionText(fields: { question: string; context: string }) {
  const question = fields.question.trim();
  if (!question) return { error: "问题不能为空" };
  db.prepare("UPDATE decision SET question = ?, context = ?").run(question, fields.context.trim());
  revalidatePath("/");
  return {};
}

// 先定权重再打分：锁定后才能打分，解锁后可以改权重但不能打分。
export async function setWeightsLocked(locked: boolean) {
  db.prepare("UPDATE decision SET weights_locked = ?").run(locked ? 1 : 0);
  revalidatePath("/");
}

export async function addCriterion(title: string) {
  if (!title.trim()) return { error: "维度不能为空" };
  db.prepare("INSERT INTO criteria (title) VALUES (?)").run(title.trim());
  revalidatePath("/");
  return {};
}

export async function updateCriterion(id: number, fields: { title: string; note: string }) {
  if (!fields.title.trim()) return { error: "维度不能为空" };
  db.prepare("UPDATE criteria SET title = ?, note = ? WHERE id = ?").run(
    fields.title.trim(),
    fields.note.trim(),
    id,
  );
  revalidatePath("/");
  return {};
}

export async function setCriterionWeight(id: number, weight: number) {
  if (weightsLocked()) return { error: "权重已锁定，先解锁再调整" };
  if (!Number.isInteger(weight) || weight < 0 || weight > WEIGHT_MAX) {
    return { error: `权重需在 0–${WEIGHT_MAX} 之间` };
  }
  db.prepare("UPDATE criteria SET weight = ? WHERE id = ?").run(weight, id);
  revalidatePath("/");
  return {};
}

export async function dropCriterion(id: number) {
  db.prepare("UPDATE criteria SET dropped = 1 WHERE id = ?").run(id);
  revalidatePath("/");
}

export async function addOption(title: string) {
  if (!title.trim()) return { error: "选项不能为空" };
  db.prepare("INSERT INTO options (title) VALUES (?)").run(title.trim());
  revalidatePath("/");
  return {};
}

export async function updateOption(id: number, fields: { title: string; note: string }) {
  if (!fields.title.trim()) return { error: "选项不能为空" };
  db.prepare("UPDATE options SET title = ?, note = ? WHERE id = ?").run(
    fields.title.trim(),
    fields.note.trim(),
    id,
  );
  revalidatePath("/");
  return {};
}

export async function dropOption(id: number) {
  db.prepare("UPDATE options SET dropped = 1 WHERE id = ?").run(id);
  revalidatePath("/");
}

export async function setScore(
  optionId: number,
  criterionId: number,
  fields: { score: number | null; reason: string },
) {
  if (!weightsLocked()) return { error: "先锁定权重再打分" };
  if (fields.score !== null && (!Number.isInteger(fields.score) || fields.score < 1 || fields.score > SCORE_MAX)) {
    return { error: `分数需在 1–${SCORE_MAX} 之间` };
  }
  db.prepare(
    `INSERT INTO scores (option_id, criterion_id, score, reason) VALUES (?, ?, ?, ?)
     ON CONFLICT (option_id, criterion_id) DO UPDATE SET score = excluded.score, reason = excluded.reason`,
  ).run(optionId, criterionId, fields.score, fields.reason.trim());
  revalidatePath("/");
  return {};
}
