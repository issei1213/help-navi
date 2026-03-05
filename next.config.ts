import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mastraパッケージをサーバーサイドexternalとして扱い、
  // クライアントバンドルへの混入を防止する
  serverExternalPackages: ["@mastra/*"],
};

export default nextConfig;
