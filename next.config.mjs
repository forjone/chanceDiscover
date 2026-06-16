/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained build for Docker / container deploys.
  output: "standalone",
  // google-play-scraper / libsql are server-only; keep them external from bundling (Next 14 API).
  experimental: {
    serverComponentsExternalPackages: ["google-play-scraper", "@libsql/client"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
