import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // chinese-days 的 package.json 声明为 CommonJS 却在 module 入口里用 ESM，交给 Node 直接 require。
  serverExternalPackages: ["chinese-days"],
};

export default nextConfig;
