"use server";

import { refresh } from "next/cache";
import {
  createTask,
  deleteTask,
  postponeOverdue,
  restoreTask,
  setSetting,
  setTaskDone,
  today,
  updateTask,
  type Priority,
  type TaskInput,
} from "@/lib/tasks";

/*
 * 日程任务的 Server Actions。只做入参校验和刷新，业务逻辑都在 src/lib/tasks.ts。
 * refresh() 让当前页面重新取服务端数据，客户端配合 useOptimistic 先行更新。
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const PRIORITIES: Priority[] = [0, 1, 3, 5];

function check(input: TaskInput): string | null {
  if (input.startDate != null && !DATE.test(input.startDate)) return "开始日期格式应为 YYYY-MM-DD";
  if (input.endDate != null && !DATE.test(input.endDate)) return "结束日期格式应为 YYYY-MM-DD";
  if (input.startTime != null && !TIME.test(input.startTime)) return "开始时间格式应为 HH:mm";
  if (input.endTime != null && !TIME.test(input.endTime)) return "结束时间格式应为 HH:mm";
  if (input.priority !== undefined && !PRIORITIES.includes(input.priority)) return "优先级无效";
  const start = `${input.startDate ?? ""} ${input.startTime ?? ""}`;
  const end = `${input.endDate ?? input.startDate ?? ""} ${input.endTime ?? ""}`;
  if (input.startDate && (input.endDate || input.endTime) && end < start) return "结束不能早于开始";
  return null;
}

export async function createTaskAction(input: TaskInput & { title: string }) {
  if (!input.title.trim()) return { error: "任务标题不能为空" };
  const error = check(input);
  if (error) return { error };
  const task = createTask(input);
  refresh();
  return { task };
}

export async function updateTaskAction(id: number, input: TaskInput) {
  const error = check(input);
  if (error) return { error };
  const task = updateTask(id, input);
  refresh();
  return { task };
}

export async function setTaskDoneAction(id: number, done: boolean) {
  setTaskDone(id, done);
  refresh();
}

export async function deleteTaskAction(id: number) {
  deleteTask(id);
  refresh();
}

export async function restoreTaskAction(id: number) {
  restoreTask(id);
  refresh();
}

export async function postponeOverdueAction() {
  postponeOverdue(today());
  refresh();
}

export async function setSettingAction(key: string, value: unknown) {
  setSetting(key, value);
  refresh();
}
