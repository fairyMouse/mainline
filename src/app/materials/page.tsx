import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Materials } from "./materials";

export const metadata: Metadata = { title: "素材 · 主线" };

// 仅开发环境可见：设计令牌与基础部件的实物对照，和页面用同一份实现。
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Materials />;
}
