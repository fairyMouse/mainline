## 通用项目规则：UI 测试

- 每次开始或接续一个项目，检查项目根目录及本次改动适用的 `AGENTS.md` 是否明确禁止 Agent 编写 UI 单元测试；缺失则直接补上。项目没有 `AGENTS.md` 时创建一个最小入口并加入本规则。保留原有内容，不批量改动未参与的项目。
- 禁止 Agent 为 UI 编写单元测试，包括组件渲染、页面结构、样式／布局、文案、按钮／导航及页面交互的单元测试。UI 改动通过目标环境中的实际渲染、交互与视觉验收验证；必要时使用端到端测试。纯业务规则、服务层、API、数据库、权限和部署逻辑仍可按风险编写单元／集成测试，不能把 UI 逻辑包装成业务层测试来绕过本规则。已有 UI 单元测试不自动删除；只运行已有检查不属于编写测试。

---

# 主线

个人目标与任务助手：长线定方向（含“不想要的”和重新评估信号），中线定阶段主线，短线任务挂在中线下，探索区限额，收件箱随手记。

- 技术栈：Next.js 16（App Router、Server Actions）＋ Node 内置 `node:sqlite`，数据在本地 `data/mainline.db`（不入库）。首次启动写入 `src/lib/seed.ts` 的初始数据。
- 当前阶段只在本机运行，不部署；AI 判断（新想法的层级与优先级建议）后续再接。
- 界面保持极简：用字号、字重与留白建立层级，避免重复标题和装饰。
- 改动后运行 `pnpm lint` 与 `pnpm exec tsc --noEmit`，UI 在浏览器中实际验收。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
