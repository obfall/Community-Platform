import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/settings", "/members", "/board", "/notifications"];
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

// ===== [Basic 認証・暫定 / 撤去予定] ここから =====
// ステージング用のサイト全体ゲート。BASIC_AUTH_USER / BASIC_AUTH_PASSWORD が両方
// 設定された環境でのみ有効化し、未設定のローカル開発・本番では無効（素通し）。
// 撤去する時は: ①この関数 ②middleware 冒頭の呼び出し ③config.matcher を元に戻す。
// （env を消すだけでも無効化はできる）
function isBasicAuthSatisfied(request: NextRequest): boolean {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !password) return true;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;

  try {
    const decoded = atob(header.slice(6));
    const sep = decoded.indexOf(":");
    if (sep === -1) return false;
    return decoded.slice(0, sep) === user && decoded.slice(sep + 1) === password;
  } catch {
    return false;
  }
}
// ===== [Basic 認証・暫定 / 撤去予定] ここまで =====

export function middleware(request: NextRequest) {
  // [Basic 認証・暫定 / 撤去予定] サイト全体ゲート（撤去時はこのブロックを削除）
  if (!isBasicAuthSatisfied(request)) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Staging", charset="UTF-8"' },
    });
  }

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

// 撤去後に戻す構成（Basic 認証をやめる時はこの matcher に戻す）:
// const config = {
//   matcher: [
//     "/dashboard/:path*",
//     "/settings/:path*",
//     "/members/:path*",
//     "/board/:path*",
//     "/notifications/:path*",
//     "/login",
//     "/register",
//     "/forgot-password",
//     "/reset-password",
//   ],
// };

export const config = {
  // [Basic 認証・暫定] サイト全体に Basic 認証を効かせるため、静的アセット・Sentry tunnel
  // 以外の全パスにマッチさせている。Basic 認証を撤去する際は上のコメントの matcher に戻す。
  // 認証リダイレクト（PROTECTED_PATHS / AUTH_PATHS）は startsWith 判定なので範囲拡大は no-op。
  matcher: ["/((?!_next/static|_next/image|favicon.ico|monitoring).*)"],
};
