import { connection } from "next/server";
import { dayInfoRange } from "@/lib/cn-calendar";
import { listTasks, shiftDate, today } from "@/lib/tasks";
import { CalendarView } from "./calendar-view";

export default async function CalendarPage() {
  await connection();
  const now = today();
  // 个人数据量小，一次取全部有日期的任务，客户端按可见范围过滤。
  const tasks = listTasks().filter((t) => t.startDate !== null);
  // 节假日与农历在服务端算好前后一年，翻到更远的月份时格子里不显示这些信息。
  const days = dayInfoRange(shiftDate(now, -400), shiftDate(now, 400));
  return <CalendarView tasks={tasks} days={days} today={now} />;
}
