import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/settings", "/members", "/board", "/notifications"];
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("accessToken")?.value;

  // 認証が必要なパスに未認証でアクセス → ログインへリダイレクト
  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p)) && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 認証済みで認証画面にアクセス → ダッシュボードへリダイレクト
  if (AUTH_PATHS.some((p) => pathname.startsWith(p)) && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/members/:path*",
    "/board/:path*",
    "/notifications/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
