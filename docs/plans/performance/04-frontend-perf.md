# 04: フロントエンド最適化

## 目的

バンドルサイズ削減・画像最適化・不要レンダリング削減で **初回読み込み速度** と **操作レスポンス** を改善する。

## 現状調査

- ❌ バンドル分析未実施（実サイズ不明）
- ❌ `<Image>` / `<img>` 不使用（grep で 0 件）
- ❌ `next.config.ts` の `images.remotePatterns` 空（R2 等の画像が最適化されない）
- ❌ `useMemo` / `useCallback` / `React.memo` 使用ゼロ（チャット画面の再レンダリング頻発リスク）
- ✅ Next.js 15 の自動コード分割は有効（App Router のページ単位）

### 主要な依存（`apps/web/package.json`）

- `@tanstack/react-query`
- `socket.io-client`（チャット用、重い）
- `hls.js`（動画再生用、重い）
- `date-fns`
- `recharts`（あれば、要確認）

## 改善項目

### 1. バンドル分析の実施（層1 で導入済）

```bash
ANALYZE=true pnpm --filter @community-platform/web build
```

→ ブラウザで treemap が開く。重い依存・大きなページを特定。

期待される発見:

- `hls.js` が動画ページ以外にも入っている可能性 → 動的 import 化
- `socket.io-client` がチャット以外にも入っている可能性 → 〃
- `recharts` 等のグラフライブラリ（あれば）が分析画面以外にも入っている可能性

### 2. 動的 import による遅延ロード

#### Before

```tsx
// apps/web/app/(dashboard)/videos/[id]/page.tsx
import Hls from "hls.js";
import { HLSPlayer } from "@/components/hls-player";

export default function VideoPage() {
  return <HLSPlayer src="..." />;
}
```

→ `hls.js` がメイン bundle に含まれる。

#### After

```tsx
import dynamic from "next/dynamic";

const HLSPlayer = dynamic(() => import("@/components/hls-player"), {
  ssr: false,
  loading: () => <div>動画を読み込み中...</div>,
});

export default function VideoPage() {
  return <HLSPlayer src="..." />;
}
```

→ 動画ページにアクセスしたときだけ `hls.js` がロードされる。バンドル分割。

#### 動的 import 候補

| コンポーネント                              | 理由                       |
| ------------------------------------------- | -------------------------- |
| `<HLSPlayer>` (hls.js 依存)                 | 動画再生時のみ必要、~100KB |
| `<RichTextEditor>` (もし TipTap 等使うなら) | 編集画面のみ必要           |
| `<ChartComponent>` (もし recharts 使うなら) | 分析画面のみ必要           |
| `<Calendar>` (重い日付ピッカーなら)         | 限定画面で利用             |
| `<EmojiPicker>` (もし絵文字選択使うなら)    | チャット入力時のみ         |

### 3. Next.js Image の導入

#### `next.config.ts` の更新

```ts
const nextConfig: NextConfig = {
  // ...
  images: {
    remotePatterns: [
      // R2 画像
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      // Picsum (デモ用)
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      // Supabase Storage（もし使うなら）
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Cloudflare Stream サムネイル
      {
        protocol: "https",
        hostname: "*.cloudflarestream.com",
      },
    ],
    // 画像フォーマットの自動変換（WebP / AVIF）
    formats: ["image/avif", "image/webp"],
    // デバイスサイズに応じた配信
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
};
```

#### コンポーネントの置き換え

ユーザーアバター・イベントカバー・商品画像等で使う:

```tsx
// before
<img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />;

// after
import Image from "next/image";

<Image
  src={user.avatarUrl ?? "/default-avatar.svg"}
  alt={user.name}
  width={40}
  height={40}
  className="rounded-full"
  priority={false} // ファーストビューなら true
  placeholder="empty"
/>;
```

#### 適用範囲

| 場所                                                       | 件数（推定） | 優先度 |
| ---------------------------------------------------------- | ------------ | ------ |
| ユーザーアバター（ヘッダー / 一覧 / 詳細）                 | 多数         | 高     |
| イベント・動画・商品のサムネイル                           | 多数         | 高     |
| アルバム写真                                               | 50+          | 高     |
| ブロードキャスト添付（メール用は SafeHtml 経由なので不要） | 少           | 低     |
| OG 画像（生成画像）                                        | 少           | 中     |

→ まず共通コンポーネント（`<UserAvatar>`, `<EventCard>` 等）から置き換えて、影響範囲を広げる。

#### `<UserAvatar>` 共通コンポーネント例

```tsx
// apps/web/components/user-avatar.tsx
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  user: { id: string; name: string; profile?: { avatarUrl: string | null } };
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = { sm: 32, md: 40, lg: 80 };

export function UserAvatar({ user, size = "md", className }: Props) {
  const px = SIZE_MAP[size];
  const src = user.profile?.avatarUrl ?? "/default-avatar.svg";

  return (
    <Image
      src={src}
      alt={user.name}
      width={px}
      height={px}
      className={cn("rounded-full object-cover", className)}
    />
  );
}
```

→ 全画面で `<UserAvatar user={...} />` を使うようにすれば、最適化が一括適用される。

### 4. メモ化の戦略的適用

#### 対象を絞る

メモ化は **再レンダリングが頻発する場所** にだけ適用。全コンポーネントに付けるのは逆効果（メモリ消費・diff コスト増）。

#### 優先対象

| 画面             | 理由                                                                  |
| ---------------- | --------------------------------------------------------------------- |
| **チャット画面** | Socket.io でメッセージ受信ごとに ChatRoom 全体が re-render する可能性 |
| **通知ベル**     | 新着通知ポーリングで Header 全体が re-render する可能性               |
| **大量リスト**   | 掲示板・イベント一覧（20+ 件）                                        |
| **テーブル系**   | 管理画面のユーザー一覧等                                              |

#### 例: チャットメッセージリスト

```tsx
// Before
function MessageList({ messages, currentUserId }) {
  return (
    <div>
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} isMine={msg.senderUserId === currentUserId} />
      ))}
    </div>
  );
}

// After
const MessageItem = React.memo(function MessageItem({ message, isMine }) {
  return <div>...</div>;
});

function MessageList({ messages, currentUserId }) {
  return (
    <div>
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} isMine={msg.senderUserId === currentUserId} />
      ))}
    </div>
  );
}
```

→ 新メッセージ追加時、既存メッセージは re-render されない。

#### Socket.io ハンドラの安定化

```tsx
// Before
useEffect(() => {
  socket.on("message", (msg) => setMessages([...messages, msg]));
  return () => socket.off("message");
}, [messages]); // ← messages 変わるたびに on/off 繰り返し

// After
const handleMessage = useCallback((msg) => {
  setMessages((prev) => [...prev, msg]);
}, []);

useEffect(() => {
  socket.on("message", handleMessage);
  return () => socket.off("message", handleMessage);
}, [handleMessage]); // ← 依存安定
```

→ ハンドラ再生成・購読解除を抑制。

### 5. React Compiler の検討（任意）

React 19 の **React Compiler** は自動メモ化を行う実験的機能。Next.js 15 で組み込み可能:

```ts
// apps/web/next.config.ts
experimental: {
  reactCompiler: true,
}
```

→ `React.memo` / `useMemo` を手動で書かなくても自動的に最適化される。

ただし **2026-04 時点でまだ完全 stable ではない**ので、Phase 11.2 では **採用見送り** が安全（**確認事項**）。

### 6. SSR / RSC の活用確認

Next.js 15 App Router の RSC は元々高速だが、`"use client"` を不必要に付けていないか確認:

```tsx
// "use client" なしで OK（サーバー側でレンダ）
export default async function EventsPage() {
  const events = await fetchEvents(); // RSC 内 fetch
  return <EventsList events={events} />;
}
```

`"use client"` を付ける必要があるのは **state / event handler / browser API を使うコンポーネント** のみ。Phase 11.2 で Audit 推奨。

### 7. フォント最適化

`apps/web/app/layout.tsx` で `next/font` を使っているか確認。Google Fonts を直接 link するより `next/font/google` 経由の方が CLS（Cumulative Layout Shift）が改善される:

```tsx
import { Noto_Sans_JP } from "next/font/google";

const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={notoSans.variable}>
      <body>{children}</body>
    </html>
  );
}
```

## 実装ステップ

### ステップ1: バンドル分析（層1 で実施済）

- `@next/bundle-analyzer` で treemap 確認
- 重い依存・ページを特定

### ステップ2: 動的 import 適用

- `<HLSPlayer>` 等の重いコンポーネントから順次

### ステップ3: Image 最適化

- `next.config.ts` の `remotePatterns` 設定
- `<UserAvatar>` 共通コンポーネント実装
- 既存箇所の `<img>` を順次置き換え

### ステップ4: メモ化

- チャット画面（最重要）
- 通知ベル
- 大量リスト系

### ステップ5: SSR / RSC Audit

- 不要な `"use client"` を削減

### ステップ6: フォント最適化

- `next/font/google` への移行確認

### ステップ7: 改善計測

- Lighthouse CI で Score 改善を確認
- バンドルサイズ Before / After 記録

## テスト方針

- ステップ2-3: 動的 import 後も動画再生・画像表示が動くか手動確認
- ステップ4: チャットで多数メッセージ受信時に画面がカクつかないか手動確認
- ステップ7: Lighthouse Score が Performance 80+ になるか

## 確定事項（2026-04-25）

- ✅ 動的 import 対象: **バンドル分析の結果を見てから決定**（計測駆動）
- ✅ `<UserAvatar>` 共通コンポーネント新規作成 + 既存箇所の段階移行
- ✅ React Compiler は **見送り**（stable 後に再検討）
- ✅ フォント最適化: **対応不要**（既に `next/font/google` で `Noto_Sans_JP` / `Noto_Serif_JP` 設定済）
- ✅ `<Image>` の `priority` 指定: ヘッダーロゴ + ホームのファーストビュー画像のみ
- ✅ メモ化対象: チャット・通知ベル・大量リストのみ（全画面網羅はしない）

## 残確認事項

なし（全項目確定）

## 成果物

- `apps/web/next.config.ts`（`remotePatterns` 設定）
- `apps/web/components/user-avatar.tsx`（新規）
- `apps/web/components/hls-player.tsx` 等の動的 import 化
- 既存コンポーネントの `<img>` → `<Image>` 置き換え
- `apps/web/app/(dashboard)/chat/_components/message-item.tsx`（`React.memo` 追加）
- 通知・大量リスト系の `useCallback` / `React.memo` 追加
- `docs/performance-baseline.md` 更新（バンドルサイズ Before/After）
