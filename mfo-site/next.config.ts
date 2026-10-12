import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Статическая сборка в папку out/ — заливается на обычный хостинг (reg.ru) без Node.js.
  output: "export",
  trailingSlash: true,
  poweredByHeader: false,
};

export default nextConfig;
