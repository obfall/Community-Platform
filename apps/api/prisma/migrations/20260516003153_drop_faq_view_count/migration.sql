-- FAQ 記事の閲覧数カラムを削除する。
-- 単純な page view しか取れていない上に運用上の指標としても活用していないため不要と判断。

ALTER TABLE "faq_articles" DROP COLUMN "view_count";
