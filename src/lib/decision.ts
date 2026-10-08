import type { Criterion, Option, Score } from "./db";

export const WEIGHT_MAX = 10;
export const SCORE_MAX = 5;

export type Standing = {
  option: Option;
  /** 0–100 的加权得分；未打完分时为 null */
  total: number | null;
  missing: number;
};

export type Change = { option: Option; criterion: Criterion; from: number; to: number };

export type Analysis =
  | { kind: "empty" }
  | { kind: "unlocked"; hasScores: boolean }
  | { kind: "incomplete"; missing: number }
  | { kind: "tie"; a: Option; b: Option }
  | {
      kind: "lead";
      leader: Option;
      runnerUp: Option;
      /** 领先分差，0–100 刻度 */
      margin: number;
      robustness: "fragile" | "moderate" | "solid";
      /** 最少改动几格分数能让第二名反超；无法反超时为 null */
      flip: Change[] | null;
      /** 只调一项权重让第二名反超的最小改动；做不到时为 null */
      weightFlip: { criterion: Criterion; from: number; to: number } | null;
    };

export function scoreOf(scores: Score[], optionId: number, criterionId: number) {
  return scores.find((s) => s.optionId === optionId && s.criterionId === criterionId);
}

export function standings(options: Option[], criteria: Criterion[], scores: Score[]): Standing[] {
  const weightSum = criteria.reduce((sum, c) => sum + c.weight, 0);
  return options
    .map((option) => {
      let points = 0;
      let missing = 0;
      for (const c of criteria) {
        const s = scoreOf(scores, option.id, c.id)?.score;
        if (s == null) missing++;
        else points += c.weight * s;
      }
      const total =
        missing > 0 || weightSum === 0 ? null : (points / (weightSum * SCORE_MAX)) * 100;
      return { option, total, missing };
    })
    .sort((a, b) => (b.total ?? -1) - (a.total ?? -1));
}

export function analyze(
  options: Option[],
  criteria: Criterion[],
  scores: Score[],
  weightsLocked: boolean,
): Analysis {
  if (options.length < 2 || criteria.length === 0) return { kind: "empty" };
  if (!weightsLocked) {
    return { kind: "unlocked", hasScores: scores.some((s) => s.score != null) };
  }

  const ranked = standings(options, criteria, scores);
  const missing = ranked.reduce((sum, r) => sum + r.missing, 0);
  if (missing > 0) return { kind: "incomplete", missing };

  const [first, second] = ranked;
  const leader = first.option;
  const runnerUp = second.option;
  const s = (o: Option, c: Criterion) => scoreOf(scores, o.id, c.id)!.score!;

  // 用整数算：D = Σ 权重 ×（领先者分 − 第二名分），D < 0 即反超。
  const gap = criteria.reduce((sum, c) => sum + c.weight * (s(leader, c) - s(runnerUp, c)), 0);
  if (gap === 0) return { kind: "tie", a: leader, b: runnerUp };

  const weightSum = criteria.reduce((sum, c) => sum + c.weight, 0);
  const margin = (gap / (weightSum * SCORE_MAX)) * 100;

  // 分数反超：每降领先者一分或升第二名一分，D 减少该维度的权重；按权重从大到小贪心取最少步数。
  const steps = criteria
    .flatMap((c) => [
      ...Array.from({ length: s(leader, c) - 1 }, () => ({ option: leader, c, delta: -1 })),
      ...Array.from({ length: SCORE_MAX - s(runnerUp, c) }, () => ({ option: runnerUp, c, delta: 1 })),
    ])
    .filter((step) => step.c.weight > 0)
    .sort(
      (a, b) =>
        b.c.weight - a.c.weight ||
        Number(a.option !== leader) - Number(b.option !== leader),
    );
  let remaining = gap;
  const taken: typeof steps = [];
  for (const step of steps) {
    if (remaining < 0) break;
    taken.push(step);
    remaining -= step.c.weight;
  }
  let flip: Change[] | null = null;
  if (remaining < 0) {
    const grouped = new Map<string, Change>();
    for (const step of taken) {
      const key = `${step.option.id}-${step.c.id}`;
      const change = grouped.get(key) ?? {
        option: step.option,
        criterion: step.c,
        from: s(step.option, step.c),
        to: s(step.option, step.c),
      };
      change.to += step.delta;
      grouped.set(key, change);
    }
    flip = [...grouped.values()];
  }

  // 权重反超：只动一项权重 w，D 随 w 线性变化，找让 D < 0 的最近整数。
  let weightFlip: { criterion: Criterion; from: number; to: number } | null = null;
  for (const c of criteria) {
    const d = s(leader, c) - s(runnerUp, c);
    if (d === 0) continue;
    const to =
      d < 0 ? Math.floor(c.weight + gap / -d) + 1 : Math.ceil(c.weight - gap / d) - 1;
    if (to < 0 || to > WEIGHT_MAX) continue;
    if (!weightFlip || Math.abs(to - c.weight) < Math.abs(weightFlip.to - weightFlip.from)) {
      weightFlip = { criterion: c, from: c.weight, to };
    }
  }

  const robustness =
    flip === null || taken.length >= 5 ? "solid" : taken.length >= 3 ? "moderate" : "fragile";

  return { kind: "lead", leader, runnerUp, margin, robustness, flip, weightFlip };
}
