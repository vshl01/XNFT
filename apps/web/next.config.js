import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so Turbopack resolves node_modules from this
  // monorepo. It otherwise mis-detects a stray lockfile in the home dir as
  // the root, which breaks PostCSS/Tailwind plugin resolution in dev.
  turbopack: {
    root: path.resolve(import.meta.dirname, "..", ".."),
  },
};

export default nextConfig;
