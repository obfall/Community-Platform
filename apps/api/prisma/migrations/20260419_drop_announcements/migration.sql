-- お知らせ機能削除: announcements テーブルと関連 enum を DROP
DROP TABLE IF EXISTS "announcements";
DROP TYPE IF EXISTS "AnnouncementAudience";
