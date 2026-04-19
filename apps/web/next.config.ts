import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@community-platform/shared"],
  images: {
    remotePatterns: [],
  },
  async redirects() {
    return [
      { source: "/mail", destination: "/broadcasts", permanent: true },
      { source: "/mail/new", destination: "/broadcasts/new", permanent: true },
      { source: "/mail/:id", destination: "/broadcasts/:id", permanent: true },
      {
        source: "/events/:id/mail",
        destination: "/events/:id/broadcasts",
        permanent: true,
      },
      { source: "/announcements", destination: "/broadcasts", permanent: true },
      { source: "/announcements/new", destination: "/broadcasts/new", permanent: true },
      { source: "/announcements/:id", destination: "/broadcasts", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "",
  project: process.env.SENTRY_PROJECT || "",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: "/monitoring",
});
