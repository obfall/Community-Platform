-- BoardCategory にトピック作成許可フラグを追加
ALTER TABLE "board_categories" ADD COLUMN "allow_topic_creation" BOOLEAN NOT NULL DEFAULT true;
