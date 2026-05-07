-- Phase 11.5-01: Locale 基盤
-- locales テーブルを新設し、UI 言語切替・マスタ翻訳・UGC originalLocale の参照元を作る。
-- code を PRIMARY KEY にすることで、参照側 FK が "ja" / "en" のリテラルで読みやすくなる。
-- is_default の partial unique index で「既定ロケールは1つ」を DB レベルで保証する。

-- CreateTable
CREATE TABLE "locales" (
    "code" VARCHAR(10) NOT NULL,
    "name_native" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "locales_pkey" PRIMARY KEY ("code")
);

-- CreateIndex（既定ロケールは最大1件）
CREATE UNIQUE INDEX "uq_locales_default" ON "locales"("is_default") WHERE "is_default";

-- CreateIndex（有効ロケールの並び順検索を高速化）
CREATE INDEX "idx_locales_enabled_sort" ON "locales"("is_enabled", "sort_order");

-- RLS（NestJS は postgres 直接接続でバイパス、anon key 経由は deny-all）
ALTER TABLE "locales" ENABLE ROW LEVEL SECURITY;

-- Seed
INSERT INTO "locales" ("code", "name_native", "name_en", "is_default", "is_enabled", "sort_order") VALUES
    ('ja', '日本語', 'Japanese', true,  true, 0),
    ('en', 'English', 'English', false, true, 1);
