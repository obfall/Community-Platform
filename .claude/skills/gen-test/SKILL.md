---
name: gen-test
description: 既存のモジュール/コンポーネントのテストを生成。テストを書く時に使用。
argument-hint: "[file-or-module-path]"
disable-model-invocation: true
---

# テスト生成

対象: `$ARGUMENTS`

## 手順

1. 指定されたファイルまたはディレクトリ内のソースコードを読み取る
2. ファイルの所属パッケージを判定し、適切なテストを生成する
3. 生成先は元ファイルと同階層の `__tests__/{filename}.test.ts(x)`

---

## バックエンド（`apps/api/` 配下）

### 対象ファイル
- `*.service.ts` — サービスのユニットテスト
- `*.controller.ts` — コントローラのユニットテスト
- `*.gateway.ts` — WebSocketゲートウェイのテスト

### テストツール
- Jest
- `@nestjs/testing` の `Test.createTestingModule`
- Prisma Client モック（`jest-mock-extended` の `DeepMockProxy<PrismaClient>`）

### テスト構造

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
// 対象サービスのインポート

describe('XxxService', () => {
  let service: XxxService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XxxService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get<XxxService>(XxxService);
    prisma = module.get(PrismaService);
  });

  describe('findAll', () => {
    it('should return paginated results', async () => { /* ... */ });
    it('should filter by deleted_at IS NULL', async () => { /* ... */ });
  });

  describe('findOne', () => {
    it('should return entity by id', async () => { /* ... */ });
    it('should throw NotFoundException when not found', async () => { /* ... */ });
  });

  describe('create', () => {
    it('should create entity with valid data', async () => { /* ... */ });
    it('should throw on duplicate (if applicable)', async () => { /* ... */ });
  });

  describe('update', () => {
    it('should update entity', async () => { /* ... */ });
    it('should throw NotFoundException when entity does not exist', async () => { /* ... */ });
  });

  describe('remove', () => {
    it('should soft-delete by setting deleted_at', async () => { /* ... */ });
    it('should throw NotFoundException when entity does not exist', async () => { /* ... */ });
  });
});
```

### 必須テスト項目
- 各CRUDメソッドの正常系
- `NotFoundException` — 存在しないIDへのアクセス
- `ConflictException` — 重複データの作成（該当する場合）
- `ForbiddenException` — 権限不足（該当する場合）
- 論理削除: `remove` が `deleted_at` を設定することを確認
- ページネーション: `findAll` が `skip`, `take` を正しく使用すること
- フィルタ: クエリパラメータによる絞り込みが正しいこと

---

## フロントエンド（`apps/web/` 配下）

### 対象ファイル
- `page.tsx` — ページコンポーネント
- `components/*.tsx` — UIコンポーネント

### テストツール
- Vitest
- `@testing-library/react`
- `@testing-library/user-event`

### テスト構造

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// 対象コンポーネントのインポート

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('XxxPage', () => {
  it('renders loading state initially', () => { /* ... */ });
  it('renders data after fetch', async () => { /* ... */ });
  it('renders error state on failure', async () => { /* ... */ });
  it('handles user interaction', async () => { /* ... */ });
});
```

### 必須テスト項目
- 初期レンダリング（ローディング状態の表示）
- データ取得成功後の表示
- エラー状態の表示
- ユーザーインタラクション（ボタンクリック、フォーム入力・送信）
- フォームバリデーションエラーの表示（該当する場合）

---

## 共有パッケージ（`packages/shared/` 配下）

### 対象ファイル
- `validators/*.ts` — Zodスキーマ
- `utils/*.ts` — ユーティリティ関数

### テストツール
- Vitest or Jest

### テスト構造

```typescript
import { createXxxSchema, updateXxxSchema } from '../xxx';

describe('createXxxSchema', () => {
  it('should accept valid input', () => {
    const result = createXxxSchema.safeParse({ /* valid data */ });
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const result = createXxxSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject invalid field values', () => {
    const result = createXxxSchema.safeParse({ /* invalid data */ });
    expect(result.success).toBe(false);
    // エラーメッセージの確認
  });
});
```

---

## ディレクトリ指定時の動作

ディレクトリパスが指定された場合は、そのディレクトリ内の全ソースファイル（テストファイルを除く）に対してテストを生成する。
