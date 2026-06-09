/** @type {import('next').NextConfig} */
// Mounted under a base path so the public site can proxy `/dashboard/*` to this
// app and everything lives on one origin. Override with NEXT_PUBLIC_BASE_PATH
// (keep lib/paths.ts in sync — it reads the same var).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/dashboard';

const nextConfig = {
  reactStrictMode: true,
  basePath,
};

export default nextConfig;
