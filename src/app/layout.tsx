import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "主线",
  description: "长线定方向，中线定阶段，短线逐件完成",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
