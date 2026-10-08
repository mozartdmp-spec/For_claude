import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Все страницы генерируются статически. Для хостинга без Node.js
  // (Yandex Object Storage, S3, обычный nginx) раскомментируйте:
  // output: "export",
  trailingSlash: true,
  poweredByHeader: false,
};

export default nextConfig;
