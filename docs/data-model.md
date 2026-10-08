# 日程模块数据模型

数据库和主线共用一个文件 `data/mainline.db`（SQLite，Node 内置 `node:sqlite`），连接来自 `src/lib/db.ts`。日程相关的表都在 `src/lib/tasks.ts` 里建，读写也只允许在那里进行。

## tasks

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER PK | |
| `title` | TEXT | 标题，去掉首尾空白后不能为空 |
| `content` | TEXT | 备注，纯文本，可以多行 |
| `priority` | INTEGER | `0` 无、`1` 低、`3` 中、`5` 高，取值与滴答一致 |
| `start_date` | TEXT `YYYY-MM-DD` | 为空表示无日期（「未安排」） |
| `start_time` | TEXT `HH:mm` | 为空表示全天 |
| `end_date` | TEXT `YYYY-MM-DD` | **包含**在内的最后一天，为空表示与 `start_date` 同一天 |
| `end_time` | TEXT `HH:mm` | 为空表示只是一个时间点（日历上按 30 分钟显示） |
| `repeat_rule` | TEXT | 重复规则，格式见下；为空表示不重复 |
| `repeat_parent_id` | INTEGER | 重复任务每完成一次会留下一条已完成记录，这个字段指回原任务 |
| `status` | TEXT | `open` 或 `done` |
| `completed_at` | TEXT | 完成时间 `YYYY-MM-DD HH:mm:ss` |
| `sort_order` | REAL | 同组内手动排序用，本期可以不用 |
| `mid_item_id` | INTEGER | 挂到主线中线 `items.id`，本期没有界面 |
| `created_at` / `updated_at` | TEXT | 本地时间 |
| `deleted_at` | TEXT | 软删除，不为空就是已删除，用于撤销。所有查询都要排除已删除的任务 |

### 时间约定
- 所有时间都是**本机本地时间字符串**，不存时间戳，也不做时区换算。
- 「今天」由服务端的 `today()` 给出，客户端通过 props 拿到，不要在客户端自己算。这样可以避免服务端渲染时出现 hydration 不一致。
- 全天任务跨天：`start_date=2026-10-01, end_date=2026-10-03`，共 3 天。
- 定时任务跨天：`start_date=2026-10-01, start_time=22:00, end_date=2026-10-02, end_time=01:00`。
- 「已过期」指 `status='open'`，并且 `coalesce(end_date, start_date) < today()`。
- 和 FullCalendar 事件之间的换算统一走 `src/lib/task-events.ts`。注意全天事件的 `end` 在 FullCalendar 里是**不包含**的。

### 重复规则 `repeat_rule`
采用 iCalendar RRULE 的子集，不带 `RRULE:` 前缀：

| 选项 | 值 |
| --- | --- |
| 每天 | `FREQ=DAILY` |
| 每 3 天 | `FREQ=DAILY;INTERVAL=3` |
| 每周一、三 | `FREQ=WEEKLY;BYDAY=MO,WE` |
| 每月 15 号 | `FREQ=MONTHLY;BYMONTHDAY=15` |
| 每年 | `FREQ=YEARLY` |
| 法定工作日 | `FREQ=DAILY;X-CN-WORKDAY=1`（跳过法定假日，包含调休上班日，用 chinese-days 判断） |

重复任务的语义与滴答一致：
- 表里只有**一条**未完成的任务，它的 `start_date` 就是「下一次」的日期。
- 日历上，从这次往后的日期按规则**计算**出虚拟的实例来显示，这些实例不入库。拖动虚拟实例时提示「只能调整最近一次」，只允许拖最近那一次。
- 完成一次：插入一条已完成的副本（`repeat_rule` 为空，`repeat_parent_id` 指向原任务），然后把原任务的日期推进到下一次。
- 删除重复任务就是删除整个系列，已完成的副本保留。
- 规则的解析和展开写在 `src/lib/repeat.ts`，是纯函数，需要写单元测试。

## settings

键值表，值是 JSON。读写用 `getSetting` / `setSetting`。

| key | 值 | 默认 |
| --- | --- | --- |
| `calendar.showCompleted` | boolean | `true` |
| `calendar.showLunar` | boolean | `false` |
| `calendar.showWeekNumbers` | boolean | `true` |
| `calendar.weekStart` | `0`（周日）或 `1`（周一） | `0` |
| `calendar.multiDayCount` | 2～6 | `3` |
| `tasks.sort` | `"time"`、`"priority"` 或 `"title"` | `"time"` |
| `tasks.showCompleted` | boolean | `false` |

新增设置项时在这张表里登记一行。

## 表结构演进

- 新库：直接改 `tasks.ts` 顶部的 `CREATE TABLE`。
- 老库：同时在下面补一行 `ensureColumn(...)`。
- 禁止删库重建，禁止改已有字段的含义。`data/` 里是真实数据。

## 以后的规划（本期不要实现）

- `lists` 表和 `tasks.list_id`：`list_id` 为空表示收集箱。
- 主线里 `items.layer='short'` 的短线条目，以后并入 `tasks`，通过 `mid_item_id` 挂到中线上。
