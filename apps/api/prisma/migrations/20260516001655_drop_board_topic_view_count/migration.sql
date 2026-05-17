-- 掲示板トピック（global / event / project）の閲覧数カラムを削除する。
-- 単純な page view しか取れていない上に UI / 集計でも活用していないため不要と判断。

ALTER TABLE "board_topics" DROP COLUMN "view_count";
ALTER TABLE "event_board_topics" DROP COLUMN "view_count";
ALTER TABLE "project_board_topics" DROP COLUMN "view_count";
