"use client";

import zhCnLocale from "@fullcalendar/core/locales/zh-cn";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { format } from "date-fns";
import type { DayInfo } from "@/lib/cn-calendar";
import { eventToInput, taskToEvent } from "@/lib/task-events";
import type { Task } from "@/lib/tasks";
import { updateTaskAction } from "../actions";

/*
 * 地基版日历：只证明 FullCalendar、中国节假日和拖拽改期能跑通。
 * 完整的滴答式界面（顶栏、视图切换、详情浮层、乐观更新等）按 docs/milestones.md 的 M2–M5 实现。
 */
export function CalendarView({
  tasks,
  days,
}: {
  tasks: Task[];
  days: Record<string, DayInfo>;
  today: string;
}) {
  const events = tasks.flatMap((t) => taskToEvent(t) ?? []);
  return (
    <div className="h-full p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        locale={zhCnLocale}
        initialView="dayGridMonth"
        firstDay={0}
        height="100%"
        weekNumbers
        editable
        events={events}
        dayCellContent={(arg) => {
          const info = days[format(arg.date, "yyyy-MM-dd")];
          return (
            <span className="flex w-full items-center gap-1">
              <span>{arg.date.getDate()}</span>
              {info?.badge && <span className="text-[10px]">{info.badge === "rest" ? "休" : "班"}</span>}
              <span className="ml-auto text-[10px]">{info?.festival}</span>
            </span>
          );
        }}
        eventDrop={async ({ event, revert }) => {
          const result = await updateTaskAction(
            Number(event.id),
            eventToInput(event.start!, event.end, event.allDay),
          );
          if (result.error) revert();
        }}
      />
    </div>
  );
}
