import type { DatabaseSync } from "node:sqlite";

// 初始数据来自「痛点驱动成长」思维导图，首次启动时写入，之后以页面编辑为准。
// 长线的“方向／不想要的／备选”由 seedDecision 写成决策表。
export function seed(db: DatabaseSync) {
  const insert = db.prepare(
    "INSERT INTO items (layer, kind, title, reason, importance, parent_id) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const add = (
    layer: string,
    title: string,
    opts: { kind?: string; reason?: string; importance?: number; parentId?: number } = {},
  ) =>
    Number(
      insert.run(
        layer,
        opts.kind ?? null,
        title,
        opts.reason ?? "",
        opts.importance ?? 2,
        opts.parentId ?? null,
      ).lastInsertRowid,
    );

  add("direction", "长期无法适应日本环境", { kind: "signal" });
  add("direction", "攒的钱已经足够支撑换一个国家长居", { kind: "signal" });

  const n2 = add("mid", "考过 N2", {
    importance: 3,
    reason: "去日本工作，语言是短板；N2 证书是当前第一优先",
  });
  const speaking = add("mid", "日语口语＋工作面试能力", {
    importance: 3,
    reason: "考完 N2 之后的第一优先",
  });

  add("short", "按计划备考 N2（已报名）", { importance: 3, parentId: n2 });
  add("short", "用语境项目练口语", {
    importance: 2,
    parentId: speaking,
    reason: "自己做的 App，既练口语也是技术作品",
  });
  add("short", "找一位日语口语老师", { importance: 2, parentId: speaking });

  add("explore", "搭建「主线」个人助手", {
    reason: "帮自己记住事情、判断优先级；限时 1～2 个晚上出雏形",
  });
  add("explore", "了解清迈长居的可行性", { reason: "对应长线备选" });
}

// 决策表初始结构：维度来自“不想要的”加两项现实约束，选项来自原方向和备选。
// 权重一律从 5 起步、分数留空，由本人判断后填写。
export function seedDecision(db: DatabaseSync) {
  db.prepare("INSERT INTO decision (id, question, context) VALUES (1, ?, ?)").run(
    "未来 3–5 年，去哪里发展？",
    "基于对不快乐场景的分析；去日本工作的核心是技术＋语言",
  );

  const criterion = db.prepare("INSERT INTO criteria (title, note) VALUES (?, ?)");
  for (const [title, note] of [
    ["摆脱加班与 PUA", "不想要：因为缺钱，在国内天天加班、被 PUA"],
    ["更高质量的交友与学习环境", "不想要：在低质量的交友和教育环境里，像 NPC 一样过日子"],
    ["远离家庭对重大决定的制约", "不想要：被家庭制约，被迫做人生重大决定"],
    ["注意力由自己掌控", "不想要：注意力被外界事件、短期欲望和他人评价牵着走"],
    ["收入与存钱速度", ""],
    ["可行性：签证、语言、门槛", ""],
  ]) {
    criterion.run(title, note);
  }

  const option = db.prepare("INSERT INTO options (title, note) VALUES (?, ?)");
  for (const [title, note] of [
    ["去日本工作", "技术＋日语求职"],
    ["清迈长居", "前期在日本打工攒钱，后期去清迈长住"],
    ["留在国内换环境", "对照组"],
  ]) {
    option.run(title, note);
  }
}
