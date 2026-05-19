import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

// ANALYZE=true でビルド時に treemap を生成（普段は素通し）
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// next-intl 設定読み込み（i18n/request.ts を参照）
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * CSP（Content Security Policy）ディレクティブの組み立て。
 * Phase 11.4 では Report-Only モードで導入し、運用観測後に enforce へ切替。
 *
 * - script-src: Next.js は dev で eval を使用、Sentry SDK もインライン script
 *   を使うため当面 'unsafe-inline' / 'unsafe-eval' を許可（nonce 化は別フェーズ）
 * - 各 *-src は外部利用ドメイン（Supabase / R2 / Cloudflare Stream / Sentry）を列挙
 */
function buildCsp(): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.sentry.io"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://picsum.photos",
      "https://*.r2.cloudflarestorage.com",
      "https://*.cloudflarestream.com",
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://*.sentry.io",
      "https://*.cloudflarestream.com",
    ],
    "media-src": ["'self'", "blob:", "https://*.cloudflarestream.com"],
    "frame-src": ["'self'", "https://*.cloudflarestream.com"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  parts.push("upgrade-insecure-requests");

  // Sentry CSP report URI が設定されていれば送信先を追加
  const reportUri = process.env.NEXT_PUBLIC_CSP_REPORT_URI;
  if (reportUri) parts.push(`report-uri ${reportUri}`);

  return parts.join("; ");
}

const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
];

// 開発環境では CSP を送らない（Next.js HMR が壊れないため）
// 本番・staging では Report-Only モードで運用観測後に enforce へ
if (process.env.NODE_ENV === "production") {
  SECURITY_HEADERS.push({
    key: "Content-Security-Policy-Report-Only",
    value: buildCsp(),
  });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@community-platform/shared"],
  images: {
    // 許可するリモートホスト（CSP の img-src と整合させる）
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.cloudflarestream.com" },
      { protocol: "https", hostname: "picsum.photos" },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // 開発環境の MinIO（R2_PUBLIC_URL=http://localhost:9000/...）
      { protocol: "http", hostname: "localhost", port: "9000" },
    ],
    // モダンフォーマット自動配信（PNG/JPEG → AVIF/WebP に変換）
    formats: ["image/avif", "image/webp"],
    // デバイスサイズに応じた解像度配信
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
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
  async rewrites() {
    const backend = process.env.API_PROXY_TARGET;
    if (!backend) return [];
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default bundleAnalyzer(
  withSentryConfig(withNextIntl(nextConfig), {
    org: process.env.SENTRY_ORG || "",
    project: process.env.SENTRY_PROJECT || "",
    silent: !process.env.CI,
    widenClientFileUpload: true,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    tunnelRoute: "/monitoring",
  }),
);
