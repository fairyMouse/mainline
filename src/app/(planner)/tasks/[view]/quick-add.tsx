"use client";

import { useState } from "react";
import { createTaskAction } from "../../actions";

export function QuickAdd({ today }: { today: string }) {
  const [title, setTitle] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        await createTaskAction({ title, startDate: today });
        setTitle("");
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="添加任务至「收集箱」"
        className="w-full rounded border border-rule bg-transparent px-3 py-2 text-sm"
      />
    </form>
  );
}
