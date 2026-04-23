# システム管理者機能: オプション管理 UI

## 背景

`docs/機能一覧.xlsx` の「システム管理者」シート『オプション管理』:

- 各オプション機能の追加、削除

機能一覧では「追加・削除」と表現されているが、オプション機能（ポイント／スキルシェア／LINE連携など）は実装コードに紐づくためランタイム新規追加は現実的でない。**本プランでは「利用可否の切替（有効化/無効化）」として扱う** ことを前提とする。

対応する API (`apps/api/src/settings/options/`) は既に完全実装済み。UI のみ未実装。

### 関連事項（スコープ外）

「設定機能」シートの『オプション機能設定』12項目（メンバー会費管理、ドロップイン、コミュニティライブラリー等）は、運営者向けのコミュニティ単位の細かい設定であり本プランとは別物。必要に応じて後続プランで対応する（`AppSetting` boolean 方式が候補）。

## 現状調査

### 既存資産（そのまま使う）

- **バックエンド** `apps/api/src/settings/options/`
  - `GET /settings/options` — `category: optional` の `FeatureSetting` 一覧を返す
  - `PATCH /settings/options/:featureKey` body `{ isAvailable: boolean }` で切替
  - どちらも `@Roles("admin")` + `RolesGuard` で admin 限定
  - `isAvailable = false` にすると `isEnabled` も自動で false に落とす仕様
- **Prisma モデル** `FeatureSetting`
  - `featureKey`（一意）/ `featureName` / `category` (`common` | `optional`) / `isAvailable` / `isEnabled` / `description` / `sortOrder`
  - 既存 seed で optional 機能 10+ 件投入済み（イベント / 掲示板 / 動画 / チャット / プロジェクト / EC / ポイント / スキルシェア / アンケート / 広告 / メール配信 / LINE連携 / オリエンテーション / アナリティクス など）
- **フロント共通**
  - `lib/api/client.ts`（既存）
  - `hooks/settings/use-app-settings.ts` / `use-features.ts` / `use-permissions.ts` のパターンを踏襲
  - `settings/system/page.tsx` 既存 Tabs（権限設定 / カスタム属性）に**タブ追加**

### 不足

- `lib/api/` にオプション用クライアントが無い（`settings.ts` に追加 or 新規 `options.ts`）
- `hooks/settings/` にオプション用 hook が無い
- `settings/system/` にオプション管理タブが無い

### `isAvailable` と `isEnabled` の違い（重要）

| フィールド    | 意味                                                           | 操作主体      |
| ------------- | -------------------------------------------------------------- | ------------- |
| `isAvailable` | **プランとしてその機能を使える状態か**（システム管理者が制御） | admin         |
| `isEnabled`   | 利用可能な機能を**実際に表示/有効にするか**（運営者が制御）    | admin / owner |

本プランは `isAvailable` の切替のみ扱う（=「オプション管理」=「プラン契約レベルの有効化」）。`isEnabled` は別の運営向け UI（`settings/features` 系）で既に対象。

## 実装方針

### バックエンド

変更なし。既存の `GET /settings/options` と `PATCH /settings/options/:featureKey` をそのまま使う。

### フロントエンド

#### 1. API クライアント `apps/web/lib/api/settings.ts` に追加

（新規ファイル作成せず既存に追記、既存の `getFeatures` / `updateFeature` と並べる）

```ts
export interface OptionFeature {
  featureKey: string;
  featureName: string;
  isAvailable: boolean;
  isEnabled: boolean;
  description: string | null;
  sortOrder: number;
}

export const settingsApi = {
  // ...既存...
  getOptions: () => apiClient.get<OptionFeature[]>("/settings/options").then((r) => r.data),
  toggleOption: (featureKey: string, isAvailable: boolean) =>
    apiClient
      .patch<OptionFeature>(`/settings/options/${featureKey}`, { isAvailable })
      .then((r) => r.data),
};
```

#### 2. hook 新規 `apps/web/hooks/settings/use-options.ts`

```ts
export function useOptions() {
  return useQuery({
    queryKey: ["settings", "options"],
    queryFn: settingsApi.getOptions,
  });
}

export function useToggleOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ featureKey, isAvailable }: { featureKey: string; isAvailable: boolean }) =>
      settingsApi.toggleOption(featureKey, isAvailable),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "options"] });
      qc.invalidateQueries({ queryKey: ["settings", "features"] });
      toast.success("オプション機能を更新しました");
    },
    onError: handleApiError,
  });
}
```

#### 3. UI: `settings/system/page.tsx` にタブ追加

既存 Tabs（権限設定 / カスタム属性）に **「オプション管理」** を追加。

```tsx
<Tabs defaultValue="permissions">
  <TabsList>
    <TabsTrigger value="permissions">権限設定</TabsTrigger>
    <TabsTrigger value="attributes">カスタム属性</TabsTrigger>
    <TabsTrigger value="options">オプション管理</TabsTrigger>
  </TabsList>
  {/* ... */}
  <TabsContent value="options" className="mt-6">
    <OptionsTab />
  </TabsContent>
</Tabs>
```

`OptionsTab` コンポーネントは同ファイル内に追加（`PermissionsTab` / `AttributesTab` と並列）:

- 画面上部に簡潔な説明テキスト
- テーブル形式で一覧
  - 列: 機能名 / 説明 / 状態バッジ（利用可/利用不可）/ トグルスイッチ
- `isAvailable` を false にする前に `AlertDialog` で確認（「利用不可にすると該当機能が全ユーザーから非表示になります」）
- `sortOrder` 順に並べる（API 側で既に ORDER BY 済み）

テーブル構造（参考）:

```
┌──────────────┬──────────────────────┬────────┬───────────┐
│ 機能名         │ 説明                  │ 状態    │ 利用可否   │
├──────────────┼──────────────────────┼────────┼───────────┤
│ ポイント       │ ポイント発行・使用       │ 利用可  │ [Switch]  │
│ スキルシェア   │ スキル出品・予約         │ 利用不可│ [Switch]  │
│ LINE連携      │ LINE認証・プッシュ通知   │ 利用可  │ [Switch]  │
└──────────────┴──────────────────────┴────────┴───────────┘
```

画面ガードは既存の `settings/system/page.tsx` の `user?.role !== "admin"` → `redirect` をそのまま利用。

## 既存資産の利用可否

| 資産                                  | 利用可否        | 備考                                       |
| ------------------------------------- | --------------- | ------------------------------------------ |
| `GET /settings/options`               | ✅ そのまま     | `category = optional` のみ返る             |
| `PATCH /settings/options/:featureKey` | ✅ そのまま     | `isAvailable` のみ切替                     |
| `FeatureSetting` seed                 | ✅ そのまま     | 機能追加は seed / マイグレーション側で対応 |
| `settings/system/page.tsx` の Tabs    | ✅ タブ追加のみ | 新規ページ作成不要                         |
| `components/ui/*` (shadcn)            | ✅ そのまま     | Table / Switch / AlertDialog / Badge       |

## 影響範囲

### DB / マイグレーション

- **変更なし**。既存 seed データで運用可能
- 将来オプション機能を追加する場合は別途マイグレーション + seed 追加（本プランの範囲外）

### バックエンド

- **変更なし**

### フロントエンド

- `apps/web/lib/api/settings.ts` — `getOptions` / `toggleOption` 追加
- `apps/web/hooks/settings/use-options.ts` — 新規
- `apps/web/app/(dashboard)/settings/system/page.tsx` — タブ追加 + `OptionsTab` コンポーネント追加

### テスト観点（手動確認）

- admin でない場合アクセス時にリダイレクト
- 一覧表示が `sortOrder` 順になっている
- Switch 切替で楽観的更新ではなくリクエスト完了後に反映される（確認ダイアログ経由）
- `isAvailable` を OFF にしたオプションは `getFeatures` 側でも同期される（`isEnabled` が自動で false になる）

## 作業順序（推奨）

1. `lib/api/settings.ts` に `OptionFeature` 型と API 関数 2 つを追加
2. `hooks/settings/use-options.ts` 新規作成
3. `settings/system/page.tsx` に Tab 追加、`OptionsTab` 実装
4. 動作確認（admin 以外リダイレクト / 切替 / `isEnabled` 同期 / UI の空状態）
