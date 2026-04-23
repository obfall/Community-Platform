# システム管理者機能: パスワード強制リセット / 管理者によるメールアドレス変更

## 背景

`docs/機能一覧.xlsx` の「システム管理者」シート『ユーザーアカウント管理』に含まれる2項目:

- パスワード強制リセット（ユーザーへのリセットメール強制送信）
- ユーザーのメールアドレス変更（本人確認後の管理者による変更対応）

いずれも API / UI ともに未実装。本プランではこの2機能をまとめて実装する（同じ画面・同じ権限境界で扱うため）。

## 現状調査

### 既存資産

- **認証系サービス** `apps/api/src/auth/auth.service.ts`
  - `forgotPassword(dto)` — `PasswordResetToken` を生成し `emailService.sendPasswordResetEmail(email, token)` を呼ぶ
  - `resetPassword(dto)` — トークン検証 → `bcrypt.hash` → `user.passwordHash` 更新
  - 実装済みロジックは流用する
- **ユーザー管理系** `apps/api/src/users/users.service.ts`
  - `validateAdminAction(targetUserId, currentUser)` — 自分自身禁止 / owner → admin 操作禁止のチェック。**再利用する**
  - `updateRole` / `updateStatus` が `@Roles("admin", "owner")` + `RolesGuard` で保護されている → 同じパターンを踏襲
- **Web 側 UI** `apps/web/app/(dashboard)/settings/members/_components/member-detail-dialog.tsx`
  - `MemberActions` コンポーネントに「保存」ボタン付きでロール/ステータス変更がある → ここにアクション追加
- **hooks / API クライアント**
  - `hooks/settings/use-members.ts` に `useUpdateUserRole` / `useUpdateUserStatus` 実装済み
  - `lib/api/members.ts` に対応 API クライアントあり
  - 同ファイルへ追加する形で進める

### 新規に必要なもの

- `POST /users/:id/force-password-reset` エンドポイント
- `PATCH /users/:id/email` エンドポイント
- 上記2つ用 DTO
- 対応する hooks / API クライアント
- UI: 詳細ダイアログの `MemberActions` に「パスワード強制リセット」ボタン + 「メールアドレス変更」ダイアログ

### セキュリティ/業務ルール

| ルール                                                                      | 対象       | 根拠                                      |
| --------------------------------------------------------------------------- | ---------- | ----------------------------------------- |
| admin / owner のみ実行可能                                                  | 両機能     | 既存の updateRole / updateStatus と揃える |
| owner は admin に対して操作不可                                             | 両機能     | `validateAdminAction` 既存ルール          |
| 自分自身には適用不可                                                        | 両機能     | `validateAdminAction` 既存ルール          |
| メール重複チェック                                                          | メール変更 | `User.email` は `@unique`                 |
| パスワード強制リセット時は既存の全 `PasswordResetToken` を失効              | パスワード | 不正利用対策・`forgotPassword` と同じ扱い |
| メール変更時は全 `RefreshToken` 失効 + `emailVerifiedAt` を null にリセット | メール変更 | 旧メールでの継続使用を防ぐ                |
| メール変更を本人に通知する（旧メール + 新メール 両方に）                    | メール変更 | 管理者の誤操作・不正対策                  |

## 実装方針

### バックエンド (`apps/api/src`)

#### 1. `users/dto/` への追加

```ts
// force-password-reset.dto.ts — body なし (action のみ)
// update-user-email.dto.ts
export class UpdateUserEmailDto {
  @IsEmail()
  email!: string;
}
```

`users/dto/index.ts` にエクスポート追加。

#### 2. `users/users.service.ts` にメソッド追加

```ts
async forcePasswordReset(id: string, currentUser: { id: string; role: string })
async updateEmail(id: string, currentUser: { id: string; role: string }, dto: UpdateUserEmailDto)
```

- `forcePasswordReset`:
  - `validateAdminAction` で権限・自己操作チェック
  - 対象ユーザーの既存 `PasswordResetToken` を全て `deletedAt`/無効化（または delete）
  - 新規 `PasswordResetToken` を発行
  - `authService.emailService.sendPasswordResetEmail(user.email, token)` を呼ぶ
    - `UsersService` から呼ぶため `EmailService` を DI。もしくは `AuthService` に `issuePasswordResetForUser(userId)` を追加し、`UsersService` からはそれを呼ぶ（推奨：重複を防ぐ）
  - 戻り値: `{ success: true }`

- `updateEmail`:
  - `validateAdminAction`
  - 同一メールへの変更は no-op で返す
  - 他ユーザーとの重複チェック（`findUnique({ email })`）
  - トランザクションで:
    - `user.email` 更新
    - `emailVerifiedAt` を null にリセット
    - 対象ユーザーの `refreshToken` を全削除
  - `emailService` で旧メール/新メール両方へ変更完了通知を送信
  - 戻り値: 更新後ユーザー情報（`findOne` 相当）

#### 3. `users/users.controller.ts` にエンドポイント追加

```ts
@Post(":id/force-password-reset")
@Roles("admin", "owner")
@UseGuards(RolesGuard)
@HttpCode(HttpStatus.OK)
forcePasswordReset(
  @Param("id", ParseUUIDPipe) id: string,
  @CurrentUser() currentUser: { id: string; role: string },
) { ... }

@Patch(":id/email")
@Roles("admin", "owner")
@UseGuards(RolesGuard)
updateEmail(
  @Param("id", ParseUUIDPipe) id: string,
  @CurrentUser() currentUser: { id: string; role: string },
  @Body() dto: UpdateUserEmailDto,
) { ... }
```

#### 4. モジュール構成

`UsersModule` に `AuthModule` ( `EmailService` 保持元) の依存が無い場合は、

- `AuthModule` 側に `issuePasswordResetForUser(userId)` メソッドを生やし `UsersModule` から利用する（`AuthService` を `export` する）
- もしくは `EmailService` / `PasswordResetToken` ロジックを切り出したサブサービスを共有

簡単さ優先で前者（`AuthService` に管理者向け発行メソッドを追加）で進める。

### フロントエンド (`apps/web`)

#### 1. `lib/api/members.ts` に API クライアント追加

```ts
export const membersApi = {
  // ...既存...
  forcePasswordReset: (id: string) =>
    apiClient.post<{ success: true }>(`/users/${id}/force-password-reset`).then((r) => r.data),
  updateEmail: (id: string, email: string) =>
    apiClient.patch<UserDetail>(`/users/${id}/email`, { email }).then((r) => r.data),
};
```

#### 2. `hooks/settings/use-members.ts` に hooks 追加

```ts
export function useForcePasswordReset() {
  return useMutation({
    mutationFn: membersApi.forcePasswordReset,
    onSuccess: () => toast.success("パスワードリセットメールを送信しました"),
    onError: handleApiError,
  });
}

export function useUpdateUserEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) => membersApi.updateEmail(id, email),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["settings", "user", id] });
      qc.invalidateQueries({ queryKey: ["settings", "users"] });
      toast.success("メールアドレスを変更しました");
    },
    onError: handleApiError,
  });
}
```

#### 3. UI: `settings/members/_components/member-detail-dialog.tsx`

`MemberActions` の右側に **追加アクション** 群を配置:

```
┌── ロール/ステータス保存 ──────────┐
│                                   │
├── パスワード強制リセット ─────────┤ ← AlertDialog で確認後実行
├── メールアドレス変更 ─────────────┤ ← Dialog に Input + 保存
└───────────────────────────────────┘
```

**ガード**: `user.id === currentUser.id` の場合や、`currentUser.role === "owner" && user.role === "admin"` の場合はボタン非表示（サーバーサイドと同じ条件）。`useAuth()` は既に import 済みのコンポーネントから参照可能。

メール変更ダイアログの zod スキーマ:

```ts
z.object({
  email: z.email("有効なメールアドレスを入力してください"),
  confirmEmail: z.string(),
}).refine((v) => v.email === v.confirmEmail, {
  path: ["confirmEmail"],
  message: "メールアドレスが一致しません",
});
```

## 既存資産の利用可否

- ✅ `PasswordResetToken` モデル / `AuthService.forgotPassword` ロジック → 強制リセットで流用
- ✅ `validateAdminAction` → 両機能の権限チェックで再利用
- ✅ `MemberDetailDialog` → 表示位置として利用（新規コンポーネント不要）
- ❌ メール変更は既存の `Patch /me/profile` には無く、新規エンドポイント必要

## 影響範囲

### DB

- スキーマ変更なし（既存の `User` / `PasswordResetToken` / `RefreshToken` を使用）
- マイグレーション **不要**

### バックエンド

- `apps/api/src/users/` — controller / service / dto を 3 メソッド分拡張
- `apps/api/src/auth/auth.module.ts` — `AuthService` を `export` に追加、または `AuthService` に `issuePasswordResetForUser` 追加
- `apps/api/src/users/users.module.ts` — `AuthModule` / `EmailModule` の import 追加（必要に応じて）

### フロントエンド

- `apps/web/lib/api/members.ts` — 関数 2 つ追加
- `apps/web/hooks/settings/use-members.ts` — hooks 2 つ追加
- `apps/web/app/(dashboard)/settings/members/_components/member-detail-dialog.tsx` — `MemberActions` 内にアクション追加

### テスト観点（手動確認）

- admin 以外でボタンが表示されない / 403 になる
- 自分自身には操作不可
- owner → admin への操作が 403
- パスワード強制リセット後、対象ユーザーがメール内リンクで新パスワード設定できる
- メール変更後、対象ユーザーが新メールでログインできる／旧メールで不可
- メール変更時に重複エラーが返る

## 作業順序（推奨）

1. Prisma 変更なしの確認
2. `AuthService.issuePasswordResetForUser(userId)` 実装 & `AuthModule` から export
3. `UsersService.forcePasswordReset` / `updateEmail` 実装
4. `UsersController` にエンドポイント追加 + Swagger 注釈
5. `lib/api/members.ts` + `use-members.ts` に関数追加
6. `member-detail-dialog.tsx` の UI 改修
7. 手動動作確認（3つのガードケース + 成功系）
