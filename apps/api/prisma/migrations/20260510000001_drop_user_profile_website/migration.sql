-- UserProfile.website を削除
-- 編集 UI が無く、データを設定する手段が無いデッドフィールドだったため。

ALTER TABLE "user_profiles" DROP COLUMN "website";
