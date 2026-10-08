"use client";

import { useState, type ReactNode } from "react";
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

const COLORS = [
  { token: "paper", use: "页面底色" },
  { token: "ink", use: "正文、标题" },
  { token: "ink-2", use: "次要文字、导语" },
  { token: "ink-3", use: "注释、未领先的分数" },
  { token: "ink-4", use: "仅占位、禁用、空分数" },
  { token: "rule", use: "行与行之间的细线" },
  { token: "rule-strong", use: "结论区上方的粗线、表头线" },
  { token: "lead", use: "唯一强调：领先项、翻盘关键、错误" },
  { token: "lead-soft", use: "展开编辑区的底色" },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Materials() {
  const [checked, setChecked] = useState(false);
  const [weight, setWeight] = useState(6);
  const [committed, setCommitted] = useState(6);
  const [score, setScore] = useState<number | null>(4);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-12 sm:py-16">
      <Kicker extra={<span>/materials · 仅开发环境</span>}>设计素材</Kicker>
      <h1 className="mt-3 font-serif text-[30px] leading-[1.25] font-bold sm:text-[44px]">
        纸面备忘录
      </h1>
      <p className="mt-4 max-w-[40em] font-serif text-base leading-[1.9] text-ink-2">
        米白纸色配墨黑，只用一个朱红强调色。层级靠字号、字重与留白，不靠卡片。说明见 docs/design.md。
      </p>

      <SectionTitle>颜色</SectionTitle>
      <ul className="grid gap-x-8 border-t border-rule sm:grid-cols-3">
        {COLORS.map((c) => (
          <li key={c.token} className="flex items-center gap-3 border-b border-rule py-3">
            <span
              className="h-8 w-8 shrink-0 rounded-full border border-rule"
              style={{ background: `var(--${c.token})` }}
            />
            <span className="font-sans text-xs">
              <span className="block text-ink">{c.token}</span>
              <span className="text-ink-3">{c.use}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-6 grid gap-4 font-sans text-sm sm:grid-cols-3">
        <div className="space-y-1 border border-rule p-4">
          <p className="text-ink">ink 正文</p>
          <p className="text-ink-2">ink-2 次要</p>
          <p className="text-ink-3">ink-3 注释</p>
          <p className="text-ink-4">ink-4 占位（不承载信息）</p>
          <p className="text-lead">lead 强调</p>
        </div>
        <div className="bg-lead p-4 text-on-lead">on-lead 压在 lead 上</div>
        <div className="bg-lead-soft p-4 text-ink">ink 压在 lead-soft 上</div>
      </div>

      <SectionTitle>字体</SectionTitle>
      <div className="space-y-4 border-t border-rule pt-4">
        <Sample label="font-serif · 44 / 30 · 结论标题">
          <p className="font-serif text-[30px] leading-[1.25] font-bold sm:text-[44px]">去日本工作，是目前领先的选择。</p>
        </Sample>
        <Sample label="font-serif · 18 · 阶段主线">
          <p className="font-serif text-lg font-semibold">考过 N2 · 日本語能力試験 · Pass the JLPT N2</p>
        </Sample>
        <Sample label="font-serif · 15 · 维度、选项、信号">
          <p className="font-serif text-[15px]">摆脱加班与 PUA · 残業のない働き方 · Escape overwork</p>
        </Sample>
        <Sample label="font-sans · 14 / 13 / 12 · 任务、说明、注释">
          <p className="font-sans text-sm">按计划备考 N2（已报名）</p>
          <p className="font-sans text-[13px] text-ink-2">领先清迈长居 6 分，结论脆弱。</p>
          <p className="font-sans text-xs text-ink-3">不想要：因为缺钱，在国内天天加班、被 PUA</p>
        </Sample>
        <Sample label="font-num · 表格数字与大分数">
          <p className="font-num text-[17px] tabular-nums">0 1 2 3 4 5 6 7 8 9 · 24% · 3→1</p>
          <div className="mt-2 flex gap-8">
            <BigScore value={74} lead />
            <BigScore value={68} />
            <BigScore value={null} />
          </div>
        </Sample>
        <Sample label="Kicker / SectionTitle">
          <Kicker>长线 · 未来 3–5 年，去哪里发展？</Kicker>
          <SectionTitle extra={<TextButton tone="lead">锁定权重，开始打分</TextButton>}>评分依据</SectionTitle>
        </Sample>
      </div>

      <SectionTitle>间距与分隔</SectionTitle>
      <div className="space-y-2 border-t border-rule pt-4 font-sans text-xs text-ink-3">
        {[
          ["py-3.5", "表格行、列表行"],
          ["mt-11", "结论区与标题之间"],
          ["mt-14", "段落标题之前"],
          ["px-5 / sm:px-12", "页面左右边距"],
        ].map(([cls, use]) => (
          <p key={cls}>
            <span className="inline-block w-36 text-ink">{cls}</span>
            {use}
          </p>
        ))}
        <div className="pt-3">
          <div className="border-t border-rule pt-1">rule · 1px 细线</div>
          <div className="mt-3 border-t-2 border-rule-strong pt-1">rule-strong · 2px，结论区上方</div>
        </div>
      </div>

      <SectionTitle>部件与状态</SectionTitle>
      <div className="grid gap-x-12 border-t border-rule sm:grid-cols-2">
        <State label="TextButton：muted / ink / lead / 禁用">
          <div className="flex gap-5">
            <TextButton>取消</TextButton>
            <TextButton tone="ink">编辑</TextButton>
            <TextButton tone="lead">保存</TextButton>
            <TextButton disabled>放下</TextButton>
          </div>
        </State>
        <State label="Checkbox：未完成 / 完成 / 禁用">
          <div className="flex gap-6 font-sans text-sm">
            <span className="flex gap-2">
              <Checkbox checked={checked} onToggle={() => setChecked(!checked)} />
              点我切换
            </span>
            <span className="flex gap-2 text-ink-3 line-through">
              <Checkbox checked onToggle={() => {}} />
              已完成
            </span>
            <span className="flex gap-2">
              <Checkbox checked={false} disabled onToggle={() => {}} />
              保存中
            </span>
          </div>
        </State>
        <State label={`WeightSlider：拖动 ${weight}，松手后保存 ${committed}；锁定时禁用`}>
          <div className="space-y-3">
            <WeightSlider value={weight} onChange={setWeight} onCommit={setCommitted} label="示例权重" />
            <WeightSlider value={5} disabled onChange={() => {}} onCommit={() => {}} label="已锁定的权重" />
          </div>
        </State>
        <State label="ScorePicker：已选 / 空 / 禁用（未锁定权重）">
          <div className="space-y-1">
            <ScorePicker value={score} onChange={setScore} label="示例分数" />
            <ScorePicker value={null} onChange={() => {}} label="未打分" />
            <ScorePicker value={3} disabled onChange={() => {}} label="禁用" />
          </div>
        </State>
        <State label="LineField：默认 / 多行 / 禁用">
          <div className="space-y-2">
            <LineField placeholder="为什么是这个分数" className="text-xs" />
            <LineField multiline placeholder="背景：为什么现在要做这个决定" className="text-xs" />
            <LineField disabled value="锁定前不能写理由" className="text-xs opacity-60" readOnly />
          </div>
        </State>
        <State label="AddLine：回车保存（延迟 0.8 秒模拟保存中）；输入“错”触发错误">
          <AddLine
            placeholder="添加维度"
            onAdd={async (v) => {
              await wait(800);
              if (v.includes("错")) return { error: "维度不能为空" };
            }}
          />
        </State>
        <State label="InlineError">
          <InlineError>探索最多同时 3 项，先完成或放下一项</InlineError>
        </State>
        <State label="空状态">
          <p className="font-sans text-[13px] leading-[1.8] text-ink-2">
            至少需要两个选项和一个维度，才能比较。
          </p>
        </State>
      </div>
    </main>
  );
}

function Sample({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-rule pb-4">
      <p className="mb-2 font-sans text-[11px] tracking-[0.12em] text-ink-3">{label}</p>
      {children}
    </div>
  );
}

function State({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-rule py-4">
      <p className="mb-3 font-sans text-[11px] tracking-[0.12em] text-ink-3">{label}</p>
      {children}
    </div>
  );
}
