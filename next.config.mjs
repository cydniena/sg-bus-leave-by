/**
 * Static export — GitLab Pages serves files, not a Node server, so there is no
 * API layer. Every upstream (arrivelah, OneMap, busrouter) sends
 * `access-control-allow-origin: *`, so the browser calls them directly and the
 * proxy the server build needed is simply gone.
 *
 * GitLab Pages serves a project at /<project-name>/, so asset URLs need that
 * prefix. CI sets PAGES_BASE_PATH from $CI_PROJECT_NAME; local dev leaves it
 * empty and serves from the root.
 */
const basePath = process.env.PAGES_BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  // fetch() does not know about basePath — the client needs it too.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
