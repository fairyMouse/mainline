"use client";

import { useState, useTransition } from "react";
import { EXPLORE_LIMIT } from "@/lib/constants";
import type { DirectionKind, Item, Layer } from "@/lib/db";
import { addItem, dropItem, moveItem, toggleDone, updateItem } from "./actions";

const IMPORTANCE = [
  { value: 3, label: "高", color: "bg-high" },
  { value: 2, label: "中", color: "bg-mid" },
  { value: 1, label: "低", color: "bg-low" },
];

export function Board({ items }: { items: Item[] }) {
  const of = (layer: Layer) => items.filter((i) => i.layer === layer);
  const direction = of("direction");
  const mids = of("mid");
  const shorts = of("short");
  const midIds = new Set(mids.map((m) => m.id));
  const orphans = shorts.filter((s) => s.parentId === null || !midIds.has(s.parentId));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <Direction items={direction} />

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_320px]">
        <section>
          <Label>中线 · 短线</Label>
          <div className="grid gap-4 md:grid-cols-2">
            {mids
              .filter((m) => m.status === "active")
              .map((mid) => (
                <MidCard key={mid.id} mid={mid} tasks={shorts.filter((s) => s.parentId === mid.id)} />
              ))}
            {orphans.length > 0 && <MidCard tasks={orphans} />}
            <div className="rounded-xl border border-dashed border-line p-4">
              <QuickAdd layer="mid" placeholder="新的阶段主线…" />
            </div>
          </div>
          <DoneMids mids={mids.filter((m) => m.status === "done")} />
        </section>

        <aside className="space-y-10">
          <Inbox items={of("inbox")} mids={mids.filter((m) => m.status === "active")} />
          <Explore items={of("explore")} />
        </aside>
      </div>
    </main>
  );
}

function Label({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between text-xs tracking-widest text-muted">
      <span>{children}</span>
      {extra}
    </div>
  );
}

/* 长线：当前方向＋不想要的＋备选＋重新评估的信号 */
function Direction({ items }: { items: Item[] }) {
  const byKind = (k: DirectionKind) => items.filter((i) => i.kind === k);
  const bet = byKind("bet")[0];
  const groups: { kind: DirectionKind; title: string; placeholder: string }[] = [
    { kind: "avoid", title: "不想要的", placeholder: "添加一条…" },
    { kind: "alt", title: "备选方向", placeholder: "添加备选…" },
    { kind: "signal", title: "出现这些信号就重新评估", placeholder: "添加信号…" },
  ];

  return (
    <section>
      <Label>长线</Label>
      {bet ? (
        <Editable item={bet} withImportance={false}>
          <h1 className="text-2xl font-semibold leading-snug sm:text-3xl">{bet.title}</h1>
          {bet.reason && <p className="mt-2 text-sm text-muted">{bet.reason}</p>}
        </Editable>
      ) : (
        <QuickAdd layer="direction" kind="bet" placeholder="写下你当前的长期方向…" />
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {groups.map((g) => (
          <div key={g.kind}>
            <h2 className="mb-2 text-sm font-medium text-muted">{g.title}</h2>
            <ul className="space-y-1.5">
              {byKind(g.kind).map((item) => (
                <li key={item.id} className="text-sm leading-relaxed">
                  <Editable item={item} withImportance={false}>
                    {item.title}
                  </Editable>
                </li>
              ))}
            </ul>
            <QuickAdd layer="direction" kind={g.kind} placeholder={g.placeholder} small />
          </div>
        ))}
      </div>
    </section>
  );
}

/* 中线卡片，挂着它下面的短线任务 */
function MidCard({ mid, tasks }: { mid?: Item; tasks: Item[] }) {
  const [showDone, setShowDone] = useState(false);
  const active = tasks.filter((t) => t.status === "active");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div className="flex flex-col rounded-xl border border-line bg-surface p-4">
      {mid ? (
        <div className="mb-3 flex gap-3">
          <Check item={mid} />
          <Editable item={mid}>
            <div className="flex items-center gap-2">
              <ImportanceDot value={mid.importance} />
              <h3 className="font-semibold">{mid.title}</h3>
            </div>
            {mid.reason && <p className="mt-1 text-xs leading-relaxed text-muted">{mid.reason}</p>}
          </Editable>
        </div>
      ) : (
        <h3 className="mb-3 text-sm font-medium text-muted">未归属的短线</h3>
      )}

      <ul className="space-y-1">
        {active.map((t) => (
          <TaskRow key={t.id} item={t} />
        ))}
      </ul>

      {mid && <QuickAdd layer="short" parentId={mid.id} placeholder="添加任务…" small />}

      {done.length > 0 && (
        <div className="mt-3 border-t border-line pt-2">
          <button onClick={() => setShowDone(!showDone)} className="text-xs text-faint hover:text-muted">
            已完成 {done.length} {showDone ? "▾" : "▸"}
          </button>
          {showDone && (
            <ul className="mt-1 space-y-1">
              {done.map((t) => (
                <TaskRow key={t.id} item={t} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function DoneMids({ mids }: { mids: Item[] }) {
  const [open, setOpen] = useState(false);
  if (mids.length === 0) return null;
  return (
    <div className="mt-6">
      <button onClick={() => setOpen(!open)} className="text-xs text-faint hover:text-muted">
        已完成的中线 {mids.length} {open ? "▾" : "▸"}
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {mids.map((m) => (
            <TaskRow key={m.id} item={m} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({ item }: { item: Item }) {
  const done = item.status === "done";
  return (
    <li className="flex gap-3 py-1">
      <Check item={item} />
      <Editable item={item}>
        <div className="flex items-center gap-2">
          <ImportanceDot value={item.importance} />
          <span className={`text-sm ${done ? "text-faint line-through" : ""}`}>{item.title}</span>
        </div>
        {item.reason && !done && <p className="mt-0.5 pl-4 text-xs text-muted">{item.reason}</p>}
      </Editable>
    </li>
  );
}

/* 收件箱：随手记，稍后归类 */
function Inbox({ items, mids }: { items: Item[]; mids: Item[] }) {
  return (
    <section>
      <Label extra={items.length > 0 && <span>{items.length}</span>}>收件箱</Label>
      <div className="rounded-xl border border-line bg-surface p-4">
        <QuickAdd layer="inbox" placeholder="随手记一个想法，回车保存" />
        {items.length > 0 && (
          <ul className="mt-3 divide-y divide-line">
            {items.map((item) => (
              <InboxRow key={item.id} item={item} mids={mids} />
            ))}
          </ul>
        )}
      </div>
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
    <li className={`py-2.5 ${pending ? "opacity-50" : ""}`}>
      <p className="text-sm">{item.title}</p>
      <select
        value=""
        onChange={(e) => route(e.target.value)}
        className="mt-1 cursor-pointer text-xs text-accent"
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
      {error && <p className="mt-1 text-xs text-high">{error}</p>}
    </li>
  );
}

/* 探索：保留有限预算 */
function Explore({ items }: { items: Item[] }) {
  const active = items.filter((i) => i.status === "active");
  const done = items.filter((i) => i.status === "done");
  return (
    <section>
      <Label
        extra={
          <span className={active.length >= EXPLORE_LIMIT ? "text-high" : ""}>
            {active.length} / {EXPLORE_LIMIT}
          </span>
        }
      >
        探索
      </Label>
      <ul className="space-y-1">
        {active.map((i) => (
          <TaskRow key={i.id} item={i} />
        ))}
      </ul>
      {active.length < EXPLORE_LIMIT && <QuickAdd layer="explore" placeholder="添加探索…" small />}
      {done.length > 0 && <p className="mt-2 text-xs text-faint">已完成 {done.length}</p>}
    </section>
  );
}

/* ——— 基础部件 ——— */

function ImportanceDot({ value }: { value: number }) {
  const imp = IMPORTANCE.find((i) => i.value === value) ?? IMPORTANCE[1];
  return <span title={`重要程度：${imp.label}`} className={`h-2 w-2 shrink-0 rounded-full ${imp.color}`} />;
}

function Check({ item }: { item: Item }) {
  const [pending, startTransition] = useTransition();
  const done = item.status === "done";
  return (
    <button
      aria-label={done ? "标记为未完成" : "标记为完成"}
      disabled={pending}
      onClick={() => startTransition(() => toggleDone(item.id))}
      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] transition-colors ${
        done ? "border-accent bg-accent text-surface" : "border-faint hover:border-accent"
      }`}
    >
      {done && "✓"}
    </button>
  );
}

function QuickAdd({
  layer,
  kind,
  parentId,
  placeholder,
  small,
}: {
  layer: Layer;
  kind?: DirectionKind;
  parentId?: number;
  placeholder: string;
  small?: boolean;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!value.trim()) return;
    startTransition(async () => {
      const res = await addItem({ layer, kind, parentId, title: value });
      if (res.error) setError(res.error);
      else {
        setValue("");
        setError("");
      }
    });
  }

  return (
    <div className={small ? "mt-2" : ""}>
      <input
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
        }}
        placeholder={placeholder}
        className={`w-full placeholder:text-faint ${small ? "text-sm" : "text-base"}`}
      />
      {error && <p className="mt-1 text-xs text-high">{error}</p>}
    </div>
  );
}

/* 点击展开编辑：标题、理由、重要程度、放下 */
function Editable({
  item,
  withImportance = true,
  children,
}: {
  item: Item;
  withImportance?: boolean;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [reason, setReason] = useState(item.reason);
  const [importance, setImportance] = useState(item.importance);
  const [pending, startTransition] = useTransition();

  function open() {
    setTitle(item.title);
    setReason(item.reason);
    setImportance(item.importance);
    setEditing(true);
  }

  if (!editing) {
    return (
      <div onClick={open} className="min-w-0 flex-1 cursor-text">
        {children}
      </div>
    );
  }

  return (
    <div className={`min-w-0 flex-1 space-y-2 ${pending ? "opacity-50" : ""}`}>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border-b border-line pb-1 text-sm font-medium"
      />
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="为什么重要？"
        rows={2}
        className="w-full resize-none rounded-md border border-line p-2 text-xs placeholder:text-faint"
      />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {withImportance &&
          IMPORTANCE.map((imp) => (
            <button
              key={imp.value}
              onClick={() => setImportance(imp.value)}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                importance === imp.value ? "border-accent text-accent" : "border-line text-muted"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${imp.color}`} />
              {imp.label}
            </button>
          ))}
        <span className="flex-1" />
        <button
          onClick={() => startTransition(() => dropItem(item.id))}
          className="text-faint hover:text-high"
        >
          放下
        </button>
        <button onClick={() => setEditing(false)} className="text-muted">
          取消
        </button>
        <button
          onClick={() =>
            startTransition(async () => {
              await updateItem(item.id, { title, reason, importance });
              setEditing(false);
            })
          }
          className="rounded-full bg-accent px-3 py-0.5 text-surface"
        >
          保存
        </button>
      </div>
    </div>
  );
}
