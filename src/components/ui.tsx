"use client";

import { useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { SCORE_MAX, WEIGHT_MAX } from "@/lib/decision";

/*
 * 方向 A「纸面备忘录」的基础部件。只负责样子和交互状态，不直接调用 Server Action，
 * 页面和 /materials 素材页共用同一份实现。
 */

type Result = { error?: string } | void;

export function Kicker({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 font-sans text-[11px] tracking-[0.24em] text-ink-3">
      <span>{children}</span>
      {extra}
    </div>
  );
}

export function SectionTitle({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mt-14 mb-3 flex items-baseline justify-between gap-4 font-sans text-[13px] tracking-[0.2em] text-ink-3">
      <h2 className="font-medium">{children}</h2>
      {extra}
    </div>
  );
}

/** 超大加权分；lead 表示领先项，value 为 null 时表示还没打完分 */
export function BigScore({ value, lead }: { value: number | null; lead?: boolean }) {
  return (
    <div
      className={`font-num text-[56px] leading-none tabular-nums sm:text-[72px] ${
        value === null ? "text-ink-4" : lead ? "text-lead" : "text-ink-3"
      }`}
    >
      {value === null ? "–" : Math.round(value)}
    </div>
  );
}

export function TextButton({
  tone = "muted",
  className = "",
  ...props
}: ComponentProps<"button"> & { tone?: "lead" | "muted" | "ink" }) {
  const color = {
    lead: "text-lead hover:opacity-80",
    muted: "text-ink-3 hover:text-ink",
    ink: "text-ink hover:text-lead",
  }[tone];
  return (
    <button
      type="button"
      {...props}
      className={`font-sans text-[13px] transition-colors disabled:cursor-default disabled:text-ink-4 ${color} ${className}`}
    />
  );
}

export function InlineError({ children }: { children: ReactNode }) {
  return children ? <p className="mt-1 font-sans text-xs text-lead">{children}</p> : null;
}

/** 一行“＋ 添加…”：回车保存，保存中变淡，出错时在下方提示 */
export function AddLine({
  placeholder,
  onAdd,
  className = "",
}: {
  placeholder: string;
  onAdd: (value: string) => Promise<Result>;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!value.trim()) return;
    startTransition(async () => {
      const res = await onAdd(value);
      if (res?.error) setError(res.error);
      else {
        setValue("");
        setError("");
      }
    });
  }

  return (
    <div className={`py-3 ${className}`}>
      <label className="flex items-center gap-2 font-sans text-[13px] text-ink-3 focus-within:text-ink">
        <span aria-hidden>＋</span>
        <input
          value={value}
          disabled={pending}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
          }}
          placeholder={placeholder}
          className="w-full text-ink placeholder:text-ink-3 disabled:opacity-50"
        />
      </label>
      <InlineError>{error}</InlineError>
    </div>
  );
}

/** 编辑态的输入框：只有一条底线，聚焦时底线变深 */
export function LineField({
  multiline,
  className = "",
  ...props
}: (ComponentProps<"input"> & { multiline?: false }) | (ComponentProps<"textarea"> & { multiline: true })) {
  const base = `w-full border-b border-rule py-1 font-sans placeholder:text-ink-4 focus:border-rule-strong ${className}`;
  if (multiline) {
    return <textarea rows={2} {...(props as ComponentProps<"textarea">)} className={`${base} resize-none`} />;
  }
  return <input {...(props as ComponentProps<"input">)} className={base} />;
}

/** 空心圆 ○ / 实心圆 ● 的完成标记 */
export function Checkbox({
  checked,
  onToggle,
  disabled,
}: {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? "标记为未完成" : "标记为完成"}
      disabled={disabled}
      onClick={onToggle}
      className={`mt-[0.45em] h-3 w-3 shrink-0 rounded-full border transition-colors disabled:opacity-50 ${
        checked ? "border-ink-3 bg-ink-3" : "border-ink-3 hover:border-lead"
      }`}
    />
  );
}

/** 权重滑块，来自方案 B；数值在右侧即时显示 */
export function WeightSlider({
  value,
  onChange,
  onCommit,
  disabled,
  label,
  className = "",
}: {
  value: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  disabled?: boolean;
  label: string;
  className?: string;
}) {
  const commit = (e: { currentTarget: HTMLInputElement }) => onCommit(Number(e.currentTarget.value));
  return (
    <input
      type="range"
      min={0}
      max={WEIGHT_MAX}
      step={1}
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
      onPointerUp={commit}
      onKeyUp={commit}
      className={`weight-slider w-full ${className}`}
    />
  );
}

/** 1–5 分的选择：选中的数字变成强调色并加底线 */
export function ScorePicker({
  value,
  onChange,
  disabled,
  label,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1">
      {Array.from({ length: SCORE_MAX }, (_, i) => i + 1).map((n) => {
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(selected ? null : n)}
            className={`h-8 w-8 border-b-2 font-num text-lg tabular-nums transition-colors disabled:opacity-40 ${
              selected ? "border-lead text-lead" : "border-transparent text-ink-3 hover:text-ink"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
