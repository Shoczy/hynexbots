/** @type {import('next').NextConfig} */
// Single-origin setup: proxy `/dashboard/*` to the dashboard app so customers
// reach it at `<site>/dashboard` instead of a separate port/domain.
//   • dev  → defaults to the local dashboard on :3001
//   • prod → only proxies when DASHBOARD_ORIGIN is set (so a website-first
//            deploy doesn't route /dashboard into a dead upstream)
const dashboardOrigin =
  process.env.DASHBOARD_ORIGIN || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : '');

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!dashboardOrigin) return [];
    return [
      { source: '/dashboard', destination: `${dashboardOrigin}/dashboard` },
      { source: '/dashboard/:path*', destination: `${dashboardOrigin}/dashboard/:path*` },
    ];
  },
};

export default nextConfig;
