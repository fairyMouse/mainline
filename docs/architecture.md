# 日程模块架构与约定

## 技术选型（已定，不要替换或升级大版本）

| 用途 | 选型 | 备注 |
| --- | --- | --- |
| 框架 | Next.js 16 App Router | **写代码前先读 `node_modules/next/dist/docs/` 里相关的文档**，这个版本和训练数据有差异 |
| 数据库 | `node:sqlite` | 同步 API，只在服务端使用 |
| 日历 | FullCalendar **6.1.x**：`core`、`react`、`daygrid`、`timegrid`、`interaction`、`list` | 不要升级到 7.x。年视图不用 FullCalendar，自己写 |
| 日期 | `date-fns` 4，中文用 `zh-CN` locale | 不要引入 dayjs、moment、luxon |
| 中国日历 | `chinese-days` | **只能在服务端用**（见下文「坑」） |
| 样式 | Tailwind 4 加上 `globals.css` 里的 CSS 变量令牌 | FullCalendar 的样式通过 `--fc-*` 变量和 `calendar.css` 覆盖 |
| 浮层定位 | `@floating-ui/react` | 用到时再装，这是唯一允许加的 UI 库 |
| 图标 | `lucide-react` | 用到时再装 |
| 单元测试 | `vitest` | 只测 `src/lib/` 下的纯函数，第一次用到时再装 |

允许新增的依赖只有上表列出的这些。确实需要别的依赖，要先停下来说明理由。

## 目录

```
src/
  app/
    (planner)/                 路由组，共用左侧图标栏
      layout.tsx
      rail.tsx                 图标栏
      actions.ts               日程模块的全部 Server Actions
      calendar/
        page.tsx               服务端：读任务、设置、节假日，交给 CalendarView
        calendar-view.tsx      客户端：FullCalendar 以及各视图的组合
        calendar.css           FullCalendar 的样式覆盖
        toolbar.tsx  day-cell.tsx  year-view.tsx  side-panel.tsx  ...
      tasks/[view]/
        page.tsx               服务端：view 取值为 today、next7 或 inbox
        task-sidebar.tsx  task-list.tsx  task-row.tsx  task-detail.tsx  ...
  components/planner/          日历和待办共用的客户端组件
    date-picker.tsx  priority-picker.tsx  repeat-picker.tsx  task-editor.tsx
    checkbox.tsx  toast.tsx  use-optimistic-tasks.ts
  lib/
    tasks.ts                   数据库读写（仅服务端）
    cn-calendar.ts             节假日、节日、农历（仅服务端）
    task-events.ts             Task 与 FullCalendar 事件互转（纯函数）
    task-groups.ts             待办分组、计数、排序（纯函数）
    repeat.ts                  重复规则解析与展开（纯函数）
    quick-add-parse.ts         快速添加的自然语言日期解析（纯函数）
```

现有的主线页面在 `src/app/page.tsx`、`board.tsx`、`actions.ts`、`src/components/ui.tsx`、`src/lib/db.ts`、`seed.ts`、`decision.ts`。本期**不要改动这些文件**。唯一的例外：如果 M1 要让 `/` 也显示图标栏，只允许在 `src/app/page.tsx` 外面包一层布局。

## 数据流

1. **读**：`page.tsx` 是服务端组件，先 `await connection()`，然后调用 `src/lib/tasks.ts` 取数据，通过 props 传给客户端组件。「今天」的日期和节假日信息也在这里算好传下去。
2. **写**：客户端组件只能调用 `(planner)/actions.ts` 里的 Server Action。Action 负责校验入参、调用 `tasks.ts`，然后执行 `refresh()`。
3. **乐观更新**：所有写操作都要先用 `useOptimistic` 更新界面，再调用 Action。
   - 失败时回滚，并在提示条里显示错误。
   - 统一封装在 `components/planner/use-optimistic-tasks.ts`，日历和待办共用。
4. **URL 状态**：日历的 `view` 和 `date` 放在 search params 里。切换视图时要同时更新 URL 和 FullCalendar，并避免循环更新。
5. **客户端组件只能 `import type` 取 `src/lib/tasks.ts`**，不能引入它的值，否则会把 `node:sqlite` 打进浏览器包。纯函数模块（`task-events`、`task-groups`、`repeat`、`quick-add-parse`）可以在两端都用。

## 已踩过的坑

- **chinese-days 与 Turbopack**：这个包声明自己是 CommonJS，但 `module` 入口用的是 ESM，所以在客户端构建时会报错。
  - 已经在 `next.config.ts` 里设了 `serverExternalPackages`。
  - 只在服务端调用它，通过 `dayInfoRange()` 算好传给客户端。
  - 重复规则里的「法定工作日」同样需要在服务端展开，或者把 `dayInfoRange` 的结果传进 `repeat.ts`。
- **同一目录只能跑一个 `next dev`**。开发服务器已经在跑的话（端口 3100），直接用它，不要再启动第二个。
- **FullCalendar 事件对象**只在需要时由 `taskToEvent` 生成。回调里用 `event.id` 回查 Task，不要依赖 FullCalendar 内部保留的旧 `extendedProps`。
- 定时任务没有结束时间时，FullCalendar 要设 `defaultTimedEventDuration="00:30"`，让它显示为 30 分钟。
- `node:sqlite` 返回的行对象没有原型，传给客户端之前要转成普通对象。`tasks.ts` 里的 `toTask` 已经处理了这一点。

## 代码约定

- 注释和界面文案用中文，与现有代码一致。注释写「为什么」，不要写「做了什么」。
- 界面极简：用字号、字重和留白建立层级，不加装饰性的边框和阴影。浮层和面板可以有一层细边框或淡阴影。
- 颜色只用令牌（Tailwind 的 `bg-paper`、`text-ink-3` 这类，或者 `var(--xxx)`），不要写死十六进制值。
- 可访问性：
  - 按钮要有可读的名称，图标按钮加 `aria-label`。
  - 浮层能用 `Esc` 关闭，关闭后焦点回到触发它的元素。
  - 复选框用真正的 `<input type="checkbox">` 或者 `role="checkbox"`。
- **不要为 UI 写单元测试**（见 `AGENTS.md`）。`src/lib/` 下的纯函数（分组、换算、重复规则、自然语言解析）要写 vitest 单测。
- 每个里程碑结束前必须全部通过：
  ```bash
  pnpm lint && pnpm exec tsc --noEmit
  ```
  另外，装了 vitest 之后还要跑 `pnpm test`。
