import { addDays, format } from "date-fns";
import type { Task, TaskInput } from "./tasks";

/*
 * Task 与 FullCalendar 事件之间的换算。纯函数，不依赖浏览器，可以写单元测试。
 * 关键差异：FullCalendar 全天事件的 end 是「不含」的次日，而 Task.endDate 是「含」的最后一天。
 */

export type CalendarEventInput = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  extendedProps: { task: Task };
};

export function taskToEvent(task: Task): CalendarEventInput | null {
  if (!task.startDate) return null;
  const allDay = task.startTime === null;
  const endDate = task.endDate ?? task.startDate;
  if (allDay) {
    const exclusiveEnd = format(addDays(new Date(`${endDate}T00:00:00`), 1), "yyyy-MM-dd");
    return {
      id: String(task.id),
      title: task.title,
      start: task.startDate,
      end: task.endDate ? exclusiveEnd : undefined,
      allDay,
      extendedProps: { task },
    };
  }
  return {
    id: String(task.id),
    title: task.title,
    start: `${task.startDate}T${task.startTime}`,
    end: task.endTime ? `${endDate}T${task.endTime}` : undefined,
    allDay,
    extendedProps: { task },
  };
}

/** 拖拽或拉伸之后，把 FullCalendar 给出的新起止换算成要写回的字段。 */
export function eventToInput(start: Date, end: Date | null, allDay: boolean): TaskInput {
  const startDate = format(start, "yyyy-MM-dd");
  if (allDay) {
    const last = end ? format(addDays(end, -1), "yyyy-MM-dd") : startDate;
    return {
      startDate,
      startTime: null,
      endDate: last === startDate ? null : last,
      endTime: null,
    };
  }
  const endDate = end ? format(end, "yyyy-MM-dd") : null;
  return {
    startDate,
    startTime: format(start, "HH:mm"),
    endDate: endDate === startDate ? null : endDate,
    endTime: end ? format(end, "HH:mm") : null,
  };
}
