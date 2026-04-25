# 03: ドメイン検索の実装（リファクタ + 新規追加 + フロント UI）

## 目的

12 ドメインのページ内検索を pgroonga ベースに実装。既存 5 ドメインはバックエンドだけ置き換え、新規 7 ドメインには検索バー UI も追加。フロント側ではハイライト表示と関連度順表示に対応。

## 対象一覧

### 既存検索ありのドメイン（5）→ pgroonga 化

| ドメイン     | エンドポイント          | 既存                                                            |
| ------------ | ----------------------- | --------------------------------------------------------------- |
| イベント     | `GET /events?search=`   | `where.title = { contains: query.search, mode: "insensitive" }` |
| 商品         | `GET /products?search=` | 〃                                                              |
| 動画         | `GET /videos?search=`   | 〃                                                              |
| プロジェクト | `GET /projects?search=` | 〃                                                              |
| ユーザー     | `GET /users?search=`    | name + nickname を `contains`                                   |

### 新規検索追加するドメイン（7）→ search パラメータ + UI 検索バー

| ドメイン   | エンドポイント                | 既存       |
| ---------- | ----------------------------- | ---------- |
| 掲示板     | `GET /board/topics?search=`   | **未実装** |
| アンケート | `GET /surveys?search=`        | **未実装** |
| スキル     | `GET /skill-listings?search=` | **未実装** |
| アルバム   | `GET /albums?search=`         | **未実装** |
| 会場       | `GET /venues?search=`         | **未実装** |
| コンテンツ | `GET /contents?search=`       | **未実装** |
| FAQ        | `GET /faq?search=`            | **未実装** |

## バックエンド実装方針

### 共通ユーティリティ

`apps/api/src/common/utils/pgroonga.ts`:

```ts
import type { PrismaClient } from "@prisma/client";

/**
 * pgroonga クエリ構文の特殊文字をエスケープ
 * 参考: https://pgroonga.github.io/reference/operators/query-v2.html
 */
export function escapePgroongaQuery(query: string): string {
  if (!query || query.trim().length === 0) return "";
  return query
    .replace(/["\\]/g, "\\$&")
    .replace(/[+\-!(){}\[\]^~*?:/]/g, " ")
    .trim();
}
```

### 公開範囲フィルタの集約（Q7 確定）

`apps/api/src/common/utils/visibility.ts`:

```ts
import type { Prisma } from "@prisma/client";

/**
 * 検索結果として表示してよいレコードのフィルタ条件を集約。
 * 各ドメインの search service から参照される共通定義。
 */
export const VISIBILITY = {
  boardTopic: {
    deletedAt: null,
    publishStatus: "published",
  } as Prisma.BoardTopicWhereInput,
  product: {
    deletedAt: null,
    publishStatus: "published",
  } as Prisma.ProductWhereInput,
  event: {
    deletedAt: null,
    NOT: { status: "draft" },
  } as Prisma.EventWhereInput,
  video: {
    deletedAt: null,
    publishStatus: "published",
  } as Prisma.VideoWhereInput,
  project: {
    deletedAt: null,
    publishStatus: "published",
  } as Prisma.ProjectWhereInput,
  user: {
    deletedAt: null,
    status: "active",
    publicInfo: { is: { publicStatus: "public" } },
  } as Prisma.UserWhereInput,
  survey: {
    deletedAt: null,
    NOT: { status: "draft" },
  } as Prisma.SurveyWhereInput,
  skillListing: {
    deletedAt: null,
    status: "active",
  } as Prisma.SkillListingWhereInput,
  album: {
    deletedAt: null,
    publishStatus: "published",
  } as Prisma.AlbumWhereInput,
  venue: {
    deletedAt: null,
    publishStatus: "published",
  } as Prisma.VenueWhereInput,
  content: {
    deletedAt: null,
    publishStatus: "published",
  } as Prisma.ContentWhereInput,
  faqArticle: {
    isPublished: true,
  } as Prisma.FaqArticleWhereInput,
};
```

### ドメイン別 search 実装パターン（既存 5 ドメイン）

例: `apps/api/src/events/events.service.ts`:

```ts
async findAll(query: EventQueryDto) {
  if (query.search) {
    return this.searchByPgroonga(query);
  }
  return this.findAllStandard(query);
}

private async searchByPgroonga(query: EventQueryDto) {
  const escaped = escapePgroongaQuery(query.search!);
  const offset = (query.page - 1) * query.limit;

  // pgroonga で ID + score + ハイライト取得
  const matched = await this.prisma.$queryRaw<Array<{
    id: string;
    score: number;
    title_highlighted: string;
    snippet_highlighted: string;
  }>>`
    SELECT
      id,
      pgroonga_score(tableoid, ctid) AS score,
      pgroonga_highlight_html(title, pgroonga_query_extract_keywords(${escaped})) AS title_highlighted,
      pgroonga_highlight_html(substr(description, 1, 200), pgroonga_query_extract_keywords(${escaped})) AS snippet_highlighted
    FROM events
    WHERE ARRAY[title, description] &@~ ${escaped}
      AND deleted_at IS NULL
      AND status != 'draft'
    ORDER BY score DESC
    LIMIT ${query.limit} OFFSET ${offset}
  `;

  if (matched.length === 0) {
    return { items: [], total: 0 };
  }

  // 詳細データを Prisma で取得（リレーション込み）
  const events = await this.prisma.event.findMany({
    where: { id: { in: matched.map(m => m.id) } },
    include: { /* 既存と同じ */ },
  });

  // pgroonga スコア順を維持 + score / highlight 注入
  const sortedItems = matched.map(m => {
    const event = events.find(e => e.id === m.id)!;
    return {
      ...event,
      score: m.score,
      titleHighlighted: m.title_highlighted,
      snippetHighlighted: m.snippet_highlighted,
    };
  });

  // 総件数（別クエリ）
  const totalResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM events
    WHERE ARRAY[title, description] &@~ ${escaped}
      AND deleted_at IS NULL
      AND status != 'draft'
  `;
  const total = Number(totalResult[0]?.count ?? 0);

  return { items: sortedItems, total };
}
```

### 新規 7 ドメインの実装

各ドメインで:

1. DTO に `search?: string` フィールド追加（class-validator + Swagger 装飾）
2. service に `searchByPgroonga` メソッド追加（上記パターン）
3. controller の既存 `findAll` に検索分岐を組み込み
4. フロント API クライアント `lib/api/{domain}.ts` の型定義に `search?` を追加

### ユーザー検索（複数テーブル統合）

ユーザーは `users` / `user_public_info` / `user_profiles` / `user_affiliations` の 4 テーブルにまたがる:

```ts
private async searchUsersByPgroonga(query: UserQueryDto) {
  const escaped = escapePgroongaQuery(query.search!);

  const matched = await this.prisma.$queryRaw<Array<{
    id: string;
    score: number;
    name_highlighted: string;
  }>>`
    SELECT DISTINCT ON (u.id)
      u.id,
      GREATEST(
        COALESCE(pgroonga_score(u.tableoid, u.ctid), 0),
        COALESCE(pgroonga_score(upi.tableoid, upi.ctid), 0),
        COALESCE(pgroonga_score(up.tableoid, up.ctid), 0),
        COALESCE(pgroonga_score(ua.tableoid, ua.ctid), 0)
      ) AS score,
      pgroonga_highlight_html(u.name, pgroonga_query_extract_keywords(${escaped})) AS name_highlighted
    FROM users u
    LEFT JOIN user_public_info upi ON upi.user_id = u.id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN user_affiliations ua ON ua.user_id = u.id
    WHERE u.deleted_at IS NULL
      AND u.status = 'active'
      AND (upi.public_status = 'public' OR upi.public_status IS NULL)
      AND (
        u.name &@~ ${escaped}
        OR ARRAY[upi.nickname, upi.introduction, upi.specialty, upi.prefecture] &@~ ${escaped}
        OR up.bio &@~ ${escaped}
        OR ARRAY[ua.organization_name, ua.title, ua.role_description] &@~ ${escaped}
      )
    ORDER BY u.id, score DESC
    LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}
  `;
  // ... details fetch & merge
}
```

`DISTINCT ON (u.id)` で同じユーザーが複数行で返るのを防ぐ。

## フロント側実装方針

### 既存検索バーへのハイライト対応

例: `apps/web/app/(dashboard)/events/_components/event-card.tsx`:

```tsx
// before
<h3>{event.title}</h3>
<p className="line-clamp-2">{event.description}</p>

// after
import { SafeHtml } from "@/components/safe-html";  // Phase 11.3 で導入

<h3>
  {event.titleHighlighted ? (
    <SafeHtml html={event.titleHighlighted} className="font-bold" />
  ) : (
    event.title
  )}
</h3>
<p className="line-clamp-2">
  {event.snippetHighlighted ? (
    <SafeHtml html={event.snippetHighlighted} />
  ) : (
    event.description
  )}
</p>
```

`SafeHtml` は Phase 11.3 で `<mark>` を含む安全な HTML 専用コンポーネントとして実装される想定。

### 新規 7 ドメインへの検索バー追加

各ページのヘッダー直下に検索フォーム追加:

```tsx
// apps/web/app/(dashboard)/board/_components/board-search-bar.tsx
"use client";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function BoardSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) params.set("search", query.trim());
    else params.delete("search");
    params.delete("page"); // ページリセット
    router.push(`/board?${params.toString()}`);
  };

  return (
    <form onSubmit={submit} className="flex gap-2 max-w-md">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="トピックを検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
    </form>
  );
}
```

各ドメイン（`board`, `surveys`, `skills`, `albums`, `venues`, `contents`, `faq`）に同様のコンポーネントを `_components/` 配下に配置。

### 0 件時のメッセージ（Q15: A 確定）

```tsx
{
  items.length === 0 && searchQuery && (
    <div className="text-center py-12 text-muted-foreground">
      <p>「{searchQuery}」に一致する結果が見つかりませんでした。</p>
    </div>
  );
}
```

## 認可・レートリミット（Q12 / Q13）

### 認可

全検索エンドポイントは既存の `@UseGuards(JwtAuthGuard)` を維持（Q12: A 確定）。

### レートリミット

既定 60 req/min/IP がそのまま適用される（Q13: B 確定）。検索エンドポイント特有の追加 `@Throttle()` は不要。

## API レスポンス互換性（Q16: A 確定）

検索時のみ追加フィールド `score`, `titleHighlighted`, `snippetHighlighted` をレスポンスに含める。検索なし（無検索の一覧）では含めない（既存互換）。

フロント側は optional として読み取り、無ければ既存表示にフォールバック。

## キャッシュ（Q17: B 確定）

TanStack Query の `staleTime: 60_000`（既存と同じ）。各ドメインの hooks（`use-events.ts` 等）の既存設定をそのまま流用。

## テスト方針

### 単体テスト

- `escapePgroongaQuery` の各ケース
- 各ドメインの search service の動作確認（モック DB or テスト DB）

### 統合テスト

- 「デモ」検索が複数ドメインで関連レコードを返す
- 公開範囲外（draft / 退会者の投稿等）が結果に入らない
- 関連度順ソートが効いている

### E2E テスト（Phase 11.5）

- 各ドメインの検索バーで検索 → 結果表示までの flow
- ハイライト表示がレンダリングされる

## 確定事項（2026-04-25）

- ✅ 既存 5 ドメインの `contains` を pgroonga 演算子に置換
- ✅ 新規 7 ドメイン（掲示板 / アンケート / スキル / アルバム / 会場 / コンテンツ / FAQ）に検索バー + API search パラメータ追加
- ✅ 公開範囲フィルタを `apps/api/src/common/utils/visibility.ts` に集約
- ✅ 検索時のみ `score` / `titleHighlighted` / `snippetHighlighted` を API レスポンスに追加
- ✅ フロントは Phase 11.3 で導入する `SafeHtml` コンポーネントでハイライト表示
- ✅ 掲示板はトピック（タイトル + 本文）のみ検索対象
- ✅ ユーザー検索は name / nickname / bio / introduction / specialty / prefecture / 所属 全対象（4 テーブル統合 OR 検索）
- ✅ 0 件時はシンプルなメッセージのみ表示

## 残確認事項

なし（全項目確定）

## 成果物

### バックエンド

- `apps/api/src/common/utils/pgroonga.ts`
- `apps/api/src/common/utils/visibility.ts`
- 既存 5 ドメインの service 修正
- 新規 7 ドメインの DTO + service 修正:
  - `apps/api/src/board/dto/topic-query.dto.ts` + service
  - `apps/api/src/surveys/dto/survey-query.dto.ts` + service
  - `apps/api/src/skills/dto/skill-query.dto.ts` + service
  - `apps/api/src/albums/dto/album-query.dto.ts` + service
  - `apps/api/src/venues/dto/venue-query.dto.ts` + service
  - `apps/api/src/contents/dto/content-query.dto.ts` + service
  - `apps/api/src/faq/dto/faq-query.dto.ts` + service
- 各 service の spec 追加・修正

### フロントエンド

- 新規ドメインの検索バーコンポーネント:
  - `apps/web/app/(dashboard)/board/_components/board-search-bar.tsx`
  - `apps/web/app/(dashboard)/surveys/_components/survey-search-bar.tsx`
  - `apps/web/app/(dashboard)/skills/_components/skill-search-bar.tsx`
  - `apps/web/app/(dashboard)/albums/_components/album-search-bar.tsx`
  - `apps/web/app/(dashboard)/venues/_components/venue-search-bar.tsx`
  - `apps/web/app/(dashboard)/contents/_components/content-search-bar.tsx`
  - `apps/web/app/(dashboard)/faq/_components/faq-search-bar.tsx`
- 既存ドメインのカードコンポーネントにハイライト表示対応:
  - `apps/web/app/(dashboard)/events/_components/event-card.tsx`
  - `apps/web/app/(dashboard)/products/_components/product-card.tsx`
  - 他 3 ドメイン
- API クライアントの型定義更新（`apps/web/lib/api/{domain}.ts`）
- 各ドメインの hooks に `search` パラメータ受け渡し追加
