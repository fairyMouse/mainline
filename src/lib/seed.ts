import type { DatabaseSync } from "node:sqlite";

// 初始数据来自「痛点驱动成长」思维导图，首次启动时写入，之后以页面编辑为准。
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

  add("direction", "出国寻求更好的环境，目前日本是首选", {
    kind: "bet",
    reason: "基于对不快乐场景的分析；去日本工作的核心是技术＋语言",
  });
  add("direction", "因为缺钱，在国内天天加班、被 PUA", { kind: "avoid" });
  add("direction", "在低质量的交友和教育环境里，像 NPC 一样过日子", { kind: "avoid" });
  add("direction", "被家庭制约，被迫做人生重大决定", { kind: "avoid" });
  add("direction", "注意力被外界事件、短期欲望和他人评价牵着走", { kind: "avoid" });
  add("direction", "清迈长居：前期在日本打工攒钱，后期去清迈长住", { kind: "alt" });
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
