import { notFound } from "next/navigation";
import { connection } from "next/server";
import { listTasks, today } from "@/lib/tasks";
import { QuickAdd } from "./quick-add";

// 三个智能清单，对应滴答清单的「今天」「最近 7 天」「收集箱」。
const VIEWS = { today: "今天", next7: "最近7天", inbox: "收集箱" } as const;

export default async function TasksPage({ params }: PageProps<"/tasks/[view]">) {
  const { view } = await params;
  if (!(view in VIEWS)) notFound();
  await connection();
  const tasks = listTasks();
  // 地基版：只列出全部未完成任务。分组、侧栏与详情面板见 docs/milestones.md 的 M6–M7。
  return (
    <div className="max-w-xl p-6">
      <h1 className="mb-4 text-xl font-semibold">{VIEWS[view as keyof typeof VIEWS]}</h1>
      <QuickAdd today={today()} />
      <ul className="mt-4 space-y-2">
        {tasks
          .filter((t) => t.status === "open")
          .map((t) => (
            <li key={t.id} className="flex gap-3 text-sm">
              <span>{t.title}</span>
              <span className="text-ink-3">{t.startDate ?? "无日期"}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
