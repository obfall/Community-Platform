-- 公開ステータスを統一: 7つのenumを削除し、PublishStatusに統合。archived → unpublished にリネーム

-- 1. 新 enum を作成
CREATE TYPE "PublishStatus" AS ENUM ('draft', 'published', 'unpublished');

-- 2. 各テーブルのカラム型を変更（archived → unpublished の変換含む）
-- board_posts
ALTER TABLE "board_posts" ALTER COLUMN "publish_status" DROP DEFAULT;
ALTER TABLE "board_posts" ALTER COLUMN "publish_status" TYPE "PublishStatus"
  USING (CASE "publish_status"::TEXT
    WHEN 'archived' THEN 'unpublished'::"PublishStatus"
    ELSE "publish_status"::TEXT::"PublishStatus"
  END);
ALTER TABLE "board_posts" ALTER COLUMN "publish_status" SET DEFAULT 'draft';

-- board_topics
ALTER TABLE "board_topics" ALTER COLUMN "publish_status" DROP DEFAULT;
ALTER TABLE "board_topics" ALTER COLUMN "publish_status" TYPE "PublishStatus"
  USING (CASE "publish_status"::TEXT
    WHEN 'archived' THEN 'unpublished'::"PublishStatus"
    ELSE "publish_status"::TEXT::"PublishStatus"
  END);
ALTER TABLE "board_topics" ALTER COLUMN "publish_status" SET DEFAULT 'published';

-- projects
ALTER TABLE "projects" ALTER COLUMN "publish_status" DROP DEFAULT;
ALTER TABLE "projects" ALTER COLUMN "publish_status" TYPE "PublishStatus"
  USING (CASE "publish_status"::TEXT
    WHEN 'archived' THEN 'unpublished'::"PublishStatus"
    ELSE "publish_status"::TEXT::"PublishStatus"
  END);
ALTER TABLE "projects" ALTER COLUMN "publish_status" SET DEFAULT 'draft';

-- project_board_posts
ALTER TABLE "project_board_posts" ALTER COLUMN "publish_status" DROP DEFAULT;
ALTER TABLE "project_board_posts" ALTER COLUMN "publish_status" TYPE "PublishStatus"
  USING (CASE "publish_status"::TEXT
    WHEN 'archived' THEN 'unpublished'::"PublishStatus"
    ELSE "publish_status"::TEXT::"PublishStatus"
  END);
ALTER TABLE "project_board_posts" ALTER COLUMN "publish_status" SET DEFAULT 'draft';

-- videos
ALTER TABLE "videos" ALTER COLUMN "publish_status" DROP DEFAULT;
ALTER TABLE "videos" ALTER COLUMN "publish_status" TYPE "PublishStatus"
  USING (CASE "publish_status"::TEXT
    WHEN 'archived' THEN 'unpublished'::"PublishStatus"
    ELSE "publish_status"::TEXT::"PublishStatus"
  END);
ALTER TABLE "videos" ALTER COLUMN "publish_status" SET DEFAULT 'draft';

-- products
ALTER TABLE "products" ALTER COLUMN "publish_status" DROP DEFAULT;
ALTER TABLE "products" ALTER COLUMN "publish_status" TYPE "PublishStatus"
  USING (CASE "publish_status"::TEXT
    WHEN 'archived' THEN 'unpublished'::"PublishStatus"
    ELSE "publish_status"::TEXT::"PublishStatus"
  END);
ALTER TABLE "products" ALTER COLUMN "publish_status" SET DEFAULT 'draft';

-- shop_settings
ALTER TABLE "shop_settings" ALTER COLUMN "publish_status" DROP DEFAULT;
ALTER TABLE "shop_settings" ALTER COLUMN "publish_status" TYPE "PublishStatus"
  USING (CASE "publish_status"::TEXT
    WHEN 'archived' THEN 'unpublished'::"PublishStatus"
    ELSE "publish_status"::TEXT::"PublishStatus"
  END);
ALTER TABLE "shop_settings" ALTER COLUMN "publish_status" SET DEFAULT 'draft';

-- albums
ALTER TABLE "albums" ALTER COLUMN "publish_status" DROP DEFAULT;
ALTER TABLE "albums" ALTER COLUMN "publish_status" TYPE "PublishStatus"
  USING (CASE "publish_status"::TEXT
    WHEN 'archived' THEN 'unpublished'::"PublishStatus"
    ELSE "publish_status"::TEXT::"PublishStatus"
  END);
ALTER TABLE "albums" ALTER COLUMN "publish_status" SET DEFAULT 'draft';

-- album_photos
ALTER TABLE "album_photos" ALTER COLUMN "publish_status" DROP DEFAULT;
ALTER TABLE "album_photos" ALTER COLUMN "publish_status" TYPE "PublishStatus"
  USING (CASE "publish_status"::TEXT
    WHEN 'archived' THEN 'unpublished'::"PublishStatus"
    ELSE "publish_status"::TEXT::"PublishStatus"
  END);
ALTER TABLE "album_photos" ALTER COLUMN "publish_status" SET DEFAULT 'published';

-- contents
ALTER TABLE "contents" ALTER COLUMN "publish_status" DROP DEFAULT;
ALTER TABLE "contents" ALTER COLUMN "publish_status" TYPE "PublishStatus"
  USING (CASE "publish_status"::TEXT
    WHEN 'archived' THEN 'unpublished'::"PublishStatus"
    ELSE "publish_status"::TEXT::"PublishStatus"
  END);
ALTER TABLE "contents" ALTER COLUMN "publish_status" SET DEFAULT 'draft';

-- venues
ALTER TABLE "venues" ALTER COLUMN "publish_status" DROP DEFAULT;
ALTER TABLE "venues" ALTER COLUMN "publish_status" TYPE "PublishStatus"
  USING (CASE "publish_status"::TEXT
    WHEN 'archived' THEN 'unpublished'::"PublishStatus"
    ELSE "publish_status"::TEXT::"PublishStatus"
  END);
ALTER TABLE "venues" ALTER COLUMN "publish_status" SET DEFAULT 'draft';

-- spaces
ALTER TABLE "spaces" ALTER COLUMN "publish_status" DROP DEFAULT;
ALTER TABLE "spaces" ALTER COLUMN "publish_status" TYPE "PublishStatus"
  USING (CASE "publish_status"::TEXT
    WHEN 'archived' THEN 'unpublished'::"PublishStatus"
    ELSE "publish_status"::TEXT::"PublishStatus"
  END);
ALTER TABLE "spaces" ALTER COLUMN "publish_status" SET DEFAULT 'draft';

-- 3. 旧 enum を削除
DROP TYPE "ContentPublishStatus";
DROP TYPE "VideoPublishStatus";
DROP TYPE "AlbumPublishStatus";
DROP TYPE "ProductPublishStatus";
DROP TYPE "ProjectPublishStatus";
DROP TYPE "ProjectBoardPublishStatus";
DROP TYPE "BoardPublishStatus";
