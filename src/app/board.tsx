"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  AddLine,
  BigScore,
  Checkbox,
  InlineError,
  Kicker,
  LineField,
  ScorePicker,
  SectionTitle,
  TextButton,
  WeightSlider,
} from "@/components/ui";
import { EXPLORE_LIMIT } from "@/lib/constants";
import type { Criterion, Decision, Item, Option } from "@/lib/db";
import { analyze, scoreOf, standings, type Analysis } from "@/lib/decision";
import {
  addCriterion,
  addItem,
  addOption,
  dropCriterion,
  dropItem,
  dropOption,
  moveItem,
  setCriterionWeight,
  setScore,
  setWeightsLocked,
  toggleDone,
  updateCriterion,
  updateDecisionText,
  updateItem,
  updateOption,
} from "./actions";

const IMPORTANCE = [
  { value: 3, label: "高" },
  { value: 2, label: "中" },
  { value: 1, label: "低" },
];

export function Board({ items, decision }: { items: Item[]; decision: Decision }) {
  const of = (layer: Item["layer"]) => items.filter((i) => i.layer === layer);
  const mids = of("mid");
  const shorts = of("short");
  const activeMids = mids.filter((m) => m.status === "active");
  const midIds = new Set(mids.map((m) => m.id));
  const orphans = shorts.filter((s) => s.parentId === null || !midIds.has(s.parentId));

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-12 sm:py-16">
      <DecisionSection decision={decision} />

      <div className="grid gap-x-14 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <SectionTitle>阶段主线</SectionTitle>
          <ol className="border-t border-rule">
            {activeMids.map((mid, i) => (
              <MidItem
                key={mid.id}
                index={i + 1}
                mid={mid}
                tasks={shorts.filter((s) => s.parentId === mid.id)}
              />
            ))}
            {orphans.length > 0 && <MidItem tasks={orphans} />}
          </ol>
          <AddLine
            placeholder="新的阶段主线"
            onAdd={(title) => addItem({ layer: "mid", title })}
          />
          <DoneMids mids={mids.filter((m) => m.status === "done")} />
        </section>

        <aside>
          <Signals items={of("direction").filter((i) => i.kind === "signal")} />
          <Inbox items={of("inbox")} mids={activeMids} />
          <Explore items={of("explore")} />
        </aside>
      </div>
    </main>
  );
}

/* ——— 长线：选项的加权对比 ——— */

function DecisionSection({ decision }: { decision: Decision }) {
  const { options, scores, weightsLocked } = decision;
  // 拖动滑块时先在本地生效，松手后再写库。
  const [draft, setDraft] = useState<Record<number, number>>({});
  const [openId, setOpenId] = useState<number | null>(null);
  const [lockPending, startLock] = useTransition();

  const criteria = decision.criteria.map((c) => ({ ...c, weight: draft[c.id] ?? c.weight }));
  const ranked = standings(options, criteria, scores);
  const analysis = analyze(options, criteria, scores, weightsLocked);
  const leaderId = analysis.kind === "lead" ? analysis.leader.id : null;
  const weightSum = criteria.reduce((sum, c) => sum + c.weight, 0);

  return (
    <section>
      <DecisionHeader decision={decision} analysis={analysis} />

      {options.length > 0 && (
        <div className="mt-11 grid border-t-2 border-rule-strong sm:auto-cols-fr sm:grid-flow-col">
          {ranked.map(({ option, total, missing }) => (
            <OptionCell
              key={option.id}
              option={option}
              total={total}
              missing={weightsLocked ? missing : null}
              lead={option.id === leaderId}
            />
          ))}
        </div>
      )}
      <Verdict analysis={analysis} />

      <SectionTitle
        extra={
          weightsLocked ? (
            <span className="text-[13px] tracking-normal">
              权重已锁定 ·{" "}
              <TextButton disabled={lockPending} onClick={() => startLock(() => setWeightsLocked(false))}>
                解锁
              </TextButton>
            </span>
          ) : (
            <TextButton
              tone="lead"
              className="tracking-normal"
              disabled={lockPending || criteria.length === 0}
              onClick={() => startLock(() => setWeightsLocked(true))}
            >
              锁定权重，开始打分
            </TextButton>
          )
        }
      >
        评分依据
      </SectionTitle>

      {criteria.length > 0 && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-rule-strong font-sans text-[11px] tracking-[0.12em] text-ink-3">
              <th className="py-2 text-left font-normal">维度</th>
              <th className="w-14 py-2 text-left font-normal sm:w-40">权重</th>
              {options.map((o) => (
                <th key={o.id} className="w-12 py-2 text-left font-normal sm:w-24">
                  {o.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {decision.criteria.map((c) => (
              <CriterionRow
                key={c.id}
                criterion={c}
                weight={draft[c.id] ?? c.weight}
                share={weightSum ? ((draft[c.id] ?? c.weight) / weightSum) * 100 : 0}
                options={options}
                scores={scores}
                leaderId={leaderId}
                locked={weightsLocked}
                open={openId === c.id}
                onToggle={() => setOpenId(openId === c.id ? null : c.id)}
                onWeightChange={(w) => setDraft((d) => ({ ...d, [c.id]: w }))}
                onWeightSaved={() =>
                  setDraft((d) => {
                    const next = { ...d };
                    delete next[c.id];
                    return next;
                  })
                }
              />
            ))}
          </tbody>
        </table>
      )}
      <div className="grid sm:grid-cols-2 sm:gap-8">
        <AddLine placeholder="添加维度" onAdd={addCriterion} />
        <AddLine placeholder="添加选项" onAdd={addOption} />
      </div>
    </section>
  );
}

function DecisionHeader({ decision, analysis }: { decision: Decision; analysis: Analysis }) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(decision.question);
  const [context, setContext] = useState(decision.context);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const headline =
    analysis.kind === "lead" ? (
      <>
        {analysis.leader.title}，<br />
        是目前领先的选择。
      </>
    ) : analysis.kind === "tie" ? (
      <>
        {analysis.a.title}与{analysis.b.title}，<br />
        目前打平。
      </>
    ) : null;

  if (editing) {
    return (
      <div className={`max-w-2xl space-y-3 ${pending ? "opacity-50" : ""}`}>
        <Kicker>长线 · 编辑</Kicker>
        <LineField
          autoFocus
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="要做的长期决定"
          className="font-serif text-2xl"
        />
        <LineField
          multiline
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="背景：为什么现在要做这个决定"
          className="text-sm"
        />
        <InlineError>{error}</InlineError>
        <div className="flex gap-4">
          <TextButton onClick={() => setEditing(false)}>取消</TextButton>
          <TextButton
            tone="lead"
            onClick={() =>
              startTransition(async () => {
                const res = await updateDecisionText({ question, context });
                if (res.error) setError(res.error);
                else setEditing(false);
              })
            }
          >
            保存
          </TextButton>
        </div>
      </div>
    );
  }

  return (
    <header
      className="cursor-text"
      onClick={() => {
        setQuestion(decision.question);
        setContext(decision.context);
        setError("");
        setEditing(true);
      }}
    >
      <Kicker>{headline ? `长线 · ${decision.question}` : "长线"}</Kicker>
      <h1 className="mt-3 font-serif text-[30px] leading-[1.25] font-bold sm:text-[44px]">
        {headline ?? decision.question}
      </h1>
      {decision.context && (
        <p className="mt-4 max-w-[40em] font-serif text-base leading-[1.9] text-ink-2">
          {decision.context}
        </p>
      )}
    </header>
  );
}

function OptionCell({
  option,
  total,
  missing,
  lead,
}: {
  option: Option;
  total: number | null;
  missing: number | null;
  lead: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(option.title);
  const [note, setNote] = useState(option.note);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="border-b border-rule py-5 sm:border-b-0 sm:border-l sm:px-5 sm:first:border-l-0 sm:first:pl-0">
      {editing ? (
        <div className={`space-y-2 ${pending ? "opacity-50" : ""}`}>
          <LineField autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="text-[15px]" />
          <LineField
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="一句话说明"
            className="text-xs"
          />
          <InlineError>{error}</InlineError>
          <div className="flex gap-4 pt-1">
            <TextButton onClick={() => startTransition(() => dropOption(option.id))}>放下</TextButton>
            <span className="flex-1" />
            <TextButton onClick={() => setEditing(false)}>取消</TextButton>
            <TextButton
              tone="lead"
              onClick={() =>
                startTransition(async () => {
                  const res = await updateOption(option.id, { title, note });
                  if (res.error) setError(res.error);
                  else setEditing(false);
                })
              }
            >
              保存
            </TextButton>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="block text-left"
          onClick={() => {
            setTitle(option.title);
            setNote(option.note);
            setError("");
            setEditing(true);
          }}
        >
          <span className="font-serif text-[15px] font-semibold">{option.title}</span>
          {lead && <span className="ml-2 font-sans text-xs text-lead">领先</span>}
          {option.note && <span className="mt-0.5 block font-sans text-xs text-ink-3">{option.note}</span>}
        </button>
      )}
      <div className="mt-4 flex items-end gap-3">
        <BigScore value={total} lead={lead} />
        {missing !== null && missing > 0 && (
          <span className="pb-1 font-sans text-xs text-ink-3">差 {missing} 项</span>
        )}
      </div>
    </div>
  );
}

const ROBUSTNESS = { fragile: "结论脆弱", moderate: "结论中等稳健", solid: "结论稳健" };

function Verdict({ analysis }: { analysis: Analysis }) {
  let body: ReactNode;
  switch (analysis.kind) {
    case "empty":
      body = "至少需要两个选项和一个维度，才能比较。";
      break;
    case "unlocked":
      body = (
        <>
          先定好每个维度有多重要，再锁定权重开始打分。这样分数不会反过来影响权重。
          {analysis.hasScores && (
            <b className="font-semibold text-lead">
              已经有打分了：现在调权重，要警惕按想要的结论倒推。
            </b>
          )}
        </>
      );
      break;
    case "incomplete":
      body = `还差 ${analysis.missing} 格没打分。打完后，这里会给出领先幅度和翻盘条件。`;
      break;
    case "tie":
      body = `${analysis.a.title}与${analysis.b.title}同分：任何一格的变化都会决定胜负。`;
      break;
    case "lead": {
      const { runnerUp, margin, robustness, flip, weightFlip } = analysis;
      body = (
        <>
          领先{runnerUp.title} {margin < 1 ? "不到 1" : Math.round(margin)} 分，
          <b className="font-semibold text-lead">{ROBUSTNESS[robustness]}</b>。
          {flip
            ? `如果${flip
                .map((c) => `${c.option.title}「${c.criterion.title}」${c.from}→${c.to}`)
                .join("、")}，${runnerUp.title}会反超。接下来最该核实「${flip[0].criterion.title}」。`
            : `即使把分数都往最不利的方向改，${runnerUp.title}也追不上。`}
          {weightFlip
            ? `只调权重的话，「${weightFlip.criterion.title}」要从 ${weightFlip.from} ${
                weightFlip.to > weightFlip.from ? "提到" : "降到"
              } ${weightFlip.to} 才会反超。`
            : "只调一项权重无法反超。"}
        </>
      );
    }
  }
  return (
    <p className="border-t border-rule pt-3.5 font-sans text-[13px] leading-[1.8] text-ink-2 sm:border-t-0 sm:pt-4">
      {body}
    </p>
  );
}

function CriterionRow({
  criterion,
  weight,
  share,
  options,
  scores,
  leaderId,
  locked,
  open,
  onToggle,
  onWeightChange,
  onWeightSaved,
}: {
  /** 已保存的维度；weight 是拖动中的即时权重 */
  criterion: Criterion;
  weight: number;
  share: number;
  options: Option[];
  scores: Decision["scores"];
  leaderId: number | null;
  locked: boolean;
  open: boolean;
  onToggle: () => void;
  onWeightChange: (weight: number) => void;
  onWeightSaved: () => void;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const reasons = options
    .map((o) => ({ o, reason: scoreOf(scores, o.id, criterion.id)?.reason }))
    .filter((r) => r.reason);

  function commitWeight(next: number) {
    if (next === criterion.weight) return onWeightSaved();
    startTransition(async () => {
      const res = await setCriterionWeight(criterion.id, next);
      setError(res.error ?? "");
      onWeightSaved();
    });
  }

  const slider = (className = "") => (
    <WeightSlider
      value={weight}
      disabled={locked}
      label={`「${criterion.title}」的权重`}
      onChange={onWeightChange}
      onCommit={commitWeight}
      className={className}
    />
  );

  return (
    <>
      <tr className={`border-b border-rule align-top ${open ? "border-b-0" : ""}`}>
        <td className="py-3.5 pr-3">
          <button type="button" onClick={onToggle} aria-expanded={open} className="block text-left">
            <span className="font-serif text-[15px]">{criterion.title}</span>
            {criterion.note && (
              <span className="mt-0.5 block font-sans text-xs text-ink-3">{criterion.note}</span>
            )}
            {reasons.length > 0 && (
              <span className="mt-0.5 line-clamp-2 block font-sans text-xs text-ink-3">
                {reasons.map((r) => `${r.o.title}：${r.reason}`).join("；")}
              </span>
            )}
          </button>
          <InlineError>{error}</InlineError>
        </td>
        <td className="py-3.5 pr-3">
          <div className="flex items-center gap-3">
            {slider("hidden sm:block")}
            <span
              className={`w-9 shrink-0 font-num text-[15px] text-ink-3 tabular-nums ${pending ? "opacity-50" : ""}`}
            >
              {Math.round(share)}%
            </span>
          </div>
        </td>
        {options.map((o) => {
          const s = scoreOf(scores, o.id, criterion.id)?.score;
          return (
            <td
              key={o.id}
              className={`py-3.5 font-num text-[17px] tabular-nums ${
                o.id === leaderId ? "text-lead" : s == null ? "text-ink-4" : ""
              }`}
            >
              {s ?? "·"}
            </td>
          );
        })}
      </tr>
      {open && (
        <tr className="border-b border-rule">
          <td colSpan={2 + options.length} className="pb-5">
            <CriterionPanel
              criterion={criterion}
              options={options}
              scores={scores}
              locked={locked}
              slider={slider("sm:hidden")}
              onClose={onToggle}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/* 展开的维度：改名、调权重（手机）、逐个选项打分并写理由 */
function CriterionPanel({
  criterion,
  options,
  scores,
  locked,
  slider,
  onClose,
}: {
  criterion: Criterion;
  options: Option[];
  scores: Decision["scores"];
  locked: boolean;
  slider: ReactNode;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(criterion.title);
  const [note, setNote] = useState(criterion.note);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const dirty = title !== criterion.title || note !== criterion.note;

  return (
    <div className="space-y-5 bg-lead-soft/40 px-4 py-4 sm:px-5">
      <div className={`grid gap-3 sm:grid-cols-2 ${pending ? "opacity-50" : ""}`}>
        <LineField value={title} onChange={(e) => setTitle(e.target.value)} className="text-sm" />
        <LineField
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="说明或来源"
          className="text-xs"
        />
      </div>
      {!locked && <div className="sm:hidden">{slider}</div>}

      <div className="space-y-3">
        {!locked && <p className="font-sans text-xs text-ink-3">锁定权重后才能打分。</p>}
        {options.map((o) => (
          <ScoreEditor
            key={o.id}
            option={o}
            criterion={criterion}
            score={scoreOf(scores, o.id, criterion.id)}
            disabled={!locked}
          />
        ))}
      </div>

      <InlineError>{error}</InlineError>
      <div className="flex gap-4">
        <TextButton onClick={() => startTransition(() => dropCriterion(criterion.id))}>放下这个维度</TextButton>
        <span className="flex-1" />
        <TextButton onClick={onClose}>收起</TextButton>
        {dirty && (
          <TextButton
            tone="lead"
            onClick={() =>
              startTransition(async () => {
                const res = await updateCriterion(criterion.id, { title, note });
                setError(res.error ?? "");
              })
            }
          >
            保存名称
          </TextButton>
        )}
      </div>
    </div>
  );
}

function ScoreEditor({
  option,
  criterion,
  score,
  disabled,
}: {
  option: Option;
  criterion: Criterion;
  score?: Decision["scores"][number];
  disabled: boolean;
}) {
  const [reason, setReason] = useState(score?.reason ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const value = score?.score ?? null;

  function save(next: { score: number | null; reason: string }) {
    startTransition(async () => {
      const res = await setScore(option.id, criterion.id, next);
      setError(res.error ?? "");
    });
  }

  return (
    <div className={`grid items-center gap-x-4 gap-y-1 sm:grid-cols-[8rem_auto_1fr] ${pending ? "opacity-60" : ""}`}>
      <span className="font-serif text-sm">{option.title}</span>
      <ScorePicker
        value={value}
        disabled={disabled || pending}
        label={`${option.title}在「${criterion.title}」上的分数`}
        onChange={(v) => save({ score: v, reason })}
      />
      <LineField
        value={reason}
        disabled={disabled}
        onChange={(e) => setReason(e.target.value)}
        onBlur={() => reason !== (score?.reason ?? "") && save({ score: value, reason })}
        placeholder="为什么是这个分数"
        className="text-xs"
      />
      <div className="sm:col-span-3">
        <InlineError>{error}</InlineError>
      </div>
    </div>
  );
}

/* ——— 阶段主线，挂着它下面的短线任务 ——— */

function MidItem({ mid, tasks, index }: { mid?: Item; tasks: Item[]; index?: number }) {
  const [showDone, setShowDone] = useState(false);
  const active = tasks.filter((t) => t.status === "active");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <li className="flex gap-3 border-b border-rule pt-3.5 pb-4">
      <span className="w-5 shrink-0 pt-1 font-num text-[13px] text-lead tabular-nums">
        {index ? String(index).padStart(2, "0") : ""}
      </span>
      <div className="min-w-0 flex-1">
        {mid ? (
          <Editable item={mid} completable>
            <h3 className="font-serif text-lg font-semibold">{mid.title}</h3>
            {mid.reason && <p className="mt-1 font-sans text-xs text-ink-3">{mid.reason}</p>}
          </Editable>
        ) : (
          <h3 className="font-sans text-sm text-ink-3">未归属的短线</h3>
        )}

        <ul className="mt-2">
          {active.map((t) => (
            <TaskRow key={t.id} item={t} />
          ))}
        </ul>
        {mid && (
          <AddLine
            className="py-1.5"
            placeholder="添加任务"
            onAdd={(title) => addItem({ layer: "short", parentId: mid.id, title })}
          />
        )}
        {done.length > 0 && (
          <>
            <TextButton onClick={() => setShowDone(!showDone)} className="text-xs">
              已完成 {done.length} {showDone ? "▾" : "▸"}
            </TextButton>
            {showDone && (
              <ul className="mt-1">
                {done.map((t) => (
                  <TaskRow key={t.id} item={t} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function DoneMids({ mids }: { mids: Item[] }) {
  const [open, setOpen] = useState(false);
  if (mids.length === 0) return null;
  return (
    <div className="mt-2">
      <TextButton onClick={() => setOpen(!open)} className="text-xs">
        已完成的阶段 {mids.length} {open ? "▾" : "▸"}
      </TextButton>
      {open && (
        <ul className="mt-2">
          {mids.map((m) => (
            <TaskRow key={m.id} item={m} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({ item }: { item: Item }) {
  const [pending, startTransition] = useTransition();
  const done = item.status === "done";
  return (
    <li className="flex gap-3 py-1 font-sans text-sm leading-relaxed">
      <Checkbox
        checked={done}
        disabled={pending}
        onToggle={() => startTransition(() => toggleDone(item.id))}
      />
      <Editable item={item}>
        <span className={done ? "text-ink-3 line-through" : ""}>
          {item.importance === 3 && !done && (
            <span
              title="重要"
              aria-label="重要"
              className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-lead align-middle"
            />
          )}
          {item.title}
        </span>
        {item.reason && !done && <p className="text-xs text-ink-3">{item.reason}</p>}
      </Editable>
    </li>
  );
}

/* ——— 侧栏：重新评估信号、收件箱、探索 ——— */

function Signals({ items }: { items: Item[] }) {
  return (
    <section>
      <SectionTitle>出现就重算</SectionTitle>
      <ul className="border-t border-rule">
        {items.map((item) => (
          <li key={item.id} className="border-b border-rule py-2.5">
            <Editable item={item} withImportance={false} reasonPlaceholder="影响哪些维度？">
              <span className="font-serif text-[15px] leading-relaxed">{item.title}</span>
              {item.reason && <span className="block font-sans text-xs text-ink-3">{item.reason}</span>}
            </Editable>
          </li>
        ))}
      </ul>
      <AddLine
        placeholder="添加信号"
        onAdd={(title) => addItem({ layer: "direction", kind: "signal", title })}
      />
    </section>
  );
}

function Inbox({ items, mids }: { items: Item[]; mids: Item[] }) {
  return (
    <section>
      <SectionTitle extra={items.length > 0 && <span className="font-num">{items.length}</span>}>
        收件箱
      </SectionTitle>
      <AddLine
        className="border-t border-rule"
        placeholder="随手记一个想法，回车保存"
        onAdd={(title) => addItem({ layer: "inbox", title })}
      />
      {items.length > 0 && (
        <ul className="border-t border-rule">
          {items.map((item) => (
            <InboxRow key={item.id} item={item} mids={mids} />
          ))}
        </ul>
      )}
    </section>
  );
}

function InboxRow({ item, mids }: { item: Item; mids: Item[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function route(value: string) {
    setError("");
    startTransition(async () => {
      if (value === "drop") return dropItem(item.id);
      const res =
        value === "explore"
          ? await moveItem(item.id, "explore")
          : await moveItem(item.id, "short", Number(value));
      if (res?.error) setError(res.error);
    });
  }

  return (
    <li className={`border-b border-rule py-2.5 ${pending ? "opacity-50" : ""}`}>
      <p className="font-sans text-sm">{item.title}</p>
      <select
        value=""
        onChange={(e) => route(e.target.value)}
        className="mt-1 cursor-pointer font-sans text-xs text-lead"
      >
        <option value="" disabled>
          归到…
        </option>
        {mids.map((m) => (
          <option key={m.id} value={m.id}>
            短线 · {m.title}
          </option>
        ))}
        <option value="explore">探索</option>
        <option value="drop">放下</option>
      </select>
      <InlineError>{error}</InlineError>
    </li>
  );
}

function Explore({ items }: { items: Item[] }) {
  const active = items.filter((i) => i.status === "active");
  const done = items.filter((i) => i.status === "done");
  const full = active.length >= EXPLORE_LIMIT;
  return (
    <section>
      <SectionTitle
        extra={
          <span className={`font-num ${full ? "text-lead" : ""}`}>
            {active.length} / {EXPLORE_LIMIT}
          </span>
        }
      >
        探索
      </SectionTitle>
      <ul className="border-t border-rule pt-1.5">
        {active.map((i) => (
          <TaskRow key={i.id} item={i} />
        ))}
      </ul>
      {full ? (
        <p className="py-3 font-sans text-xs text-ink-3">已满，先完成或放下一项。</p>
      ) : (
        <AddLine placeholder="添加探索" onAdd={(title) => addItem({ layer: "explore", title })} />
      )}
      {done.length > 0 && <p className="font-sans text-xs text-ink-3">已完成 {done.length}</p>}
    </section>
  );
}

/* 点击展开编辑：标题、理由、重要程度、完成、放下 */
function Editable({
  item,
  withImportance = true,
  completable,
  reasonPlaceholder = "为什么重要？",
  children,
}: {
  item: Item;
  withImportance?: boolean;
  completable?: boolean;
  reasonPlaceholder?: string;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [reason, setReason] = useState(item.reason);
  const [importance, setImportance] = useState(item.importance);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div
        onClick={() => {
          setTitle(item.title);
          setReason(item.reason);
          setImportance(item.importance);
          setEditing(true);
        }}
        className="min-w-0 flex-1 cursor-text"
      >
        {children}
      </div>
    );
  }

  return (
    <div className={`min-w-0 flex-1 space-y-2 py-1 ${pending ? "opacity-50" : ""}`}>
      <LineField autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="text-sm" />
      <LineField
        multiline
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={reasonPlaceholder}
        className="text-xs"
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {withImportance && (
          <div role="radiogroup" aria-label="重要程度" className="flex gap-2 font-sans text-xs">
            {IMPORTANCE.map((imp) => (
              <button
                key={imp.value}
                type="button"
                role="radio"
                aria-checked={importance === imp.value}
                onClick={() => setImportance(imp.value)}
                className={`border-b px-0.5 ${
                  importance === imp.value ? "border-lead text-lead" : "border-transparent text-ink-3"
                }`}
              >
                {imp.label}
              </button>
            ))}
          </div>
        )}
        <span className="flex-1" />
        {completable && (
          <TextButton onClick={() => startTransition(() => toggleDone(item.id))}>完成这一阶段</TextButton>
        )}
        <TextButton onClick={() => startTransition(() => dropItem(item.id))}>放下</TextButton>
        <TextButton onClick={() => setEditing(false)}>取消</TextButton>
        <TextButton
          tone="lead"
          onClick={() =>
            startTransition(async () => {
              await updateItem(item.id, { title, reason, importance });
              setEditing(false);
            })
          }
        >
          保存
        </TextButton>
      </div>
    </div>
  );
}
