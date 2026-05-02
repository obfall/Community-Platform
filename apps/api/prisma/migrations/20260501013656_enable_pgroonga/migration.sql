-- Phase 11.1: pgroonga 拡張を有効化
--
-- pgroonga = Groonga ベースの PostgreSQL 拡張。日本語形態素解析（MeCab）と
-- 関連度スコア・ハイライトに対応した全文検索を提供する。
--
-- ローカル/CI/E2E は groonga/pgroonga:latest-alpine-16 イメージでバイナリ同梱済み。
-- Supabase 開発・本番は事前に Dashboard > Database > Extensions で
-- pgroonga を有効化しておくこと。本マイグレは IF NOT EXISTS なので冪等。

CREATE EXTENSION IF NOT EXISTS pgroonga;

COMMENT ON EXTENSION pgroonga IS
  'Groonga based PostgreSQL extension for full-text search (Phase 11.1)';
