import { format } from "date-fns";
import { getDayDetail, getLunarDate, getLunarFestivals, getSolarTerms } from "chinese-days";

/*
 * 日历格子里的中国日历信息：法定节假日的「休／班」角标、节日名、农历与节气。
 * 数据来自 chinese-days（随国务院每年公布的安排更新，升级依赖即可拿到新一年的数据）。
 * 只在服务端调用：这个库的打包格式不兼容 Turbopack 的客户端构建（见 next.config.ts），
 * 页面用 dayInfoRange 算好一段日期的信息再传给客户端组件。
 */

export type DayBadge = "rest" | "work" | null;

/** 法定安排里的放假日返回 rest，调休上班日返回 work，普通工作日和普通周末返回 null。 */
export function dayBadge(date: string): DayBadge {
  const detail = getDayDetail(date);
  // 法定安排的 name 形如 "National Day,国庆节,3"，普通日子只是星期名。
  if (!detail.name.includes(",")) return null;
  return detail.work ? "work" : "rest";
}

const SOLAR_FESTIVALS: Record<string, string> = {
  "01-01": "元旦",
  "02-14": "情人节",
  "03-08": "妇女节",
  "05-01": "劳动节",
  "05-04": "青年节",
  "06-01": "儿童节",
  "07-01": "建党节",
  "08-01": "建军节",
  "09-10": "教师节",
  "10-01": "国庆节",
  "12-24": "平安夜",
  "12-25": "圣诞节",
};

// 农历节日只保留常见的几个，库里的冷门节日（如孔子诞辰）不显示。
const LUNAR_FESTIVALS = new Set(["除夕", "春节", "元宵节", "端午节", "七夕节", "中元节", "中秋节", "重阳节", "腊八节"]);

/** 当天的节日名，没有则为 null。农历节日优先。 */
export function festival(date: string): string | null {
  const lunar = getLunarFestivals(date)
    .flatMap((f) => f.name)
    .find((name) => LUNAR_FESTIVALS.has(name));
  return lunar ?? SOLAR_FESTIVALS[date.slice(5)] ?? null;
}

/** 开启「显示农历」时格子里的小字：节气优先，初一显示月份，其余显示日。 */
export function lunarLabel(date: string): string {
  const term = getSolarTerms(date, date)[0];
  if (term) return term.name;
  const lunar = getLunarDate(date);
  return lunar.lunarDay === 1 ? `${lunar.isLeap ? "闰" : ""}${lunar.lunarMonCN}` : lunar.lunarDayCN;
}

export type DayInfo = { badge: DayBadge; festival: string | null; lunar: string };

/** [from, to] 闭区间内每天的信息，键为 YYYY-MM-DD。 */
export function dayInfoRange(from: string, to: string): Record<string, DayInfo> {
  const out: Record<string, DayInfo> = {};
  for (let d = new Date(`${from}T00:00:00`); ; d.setDate(d.getDate() + 1)) {
    const date = format(d, "yyyy-MM-dd");
    if (date > to) break;
    out[date] = { badge: dayBadge(date), festival: festival(date), lunar: lunarLabel(date) };
  }
  return out;
}
