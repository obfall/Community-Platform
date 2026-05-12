-- UserProfile.allowDirectMessages を削除
-- 「DM 受信許可」設定として用意されていたが、編集 UI も無く chat モジュールで
-- 参照もされていないデッドフィールドだったため削除する。
-- 将来 DM 拒否機能が必要になった段階で改めて設計・追加する。

ALTER TABLE "user_profiles" DROP COLUMN "allow_direct_messages";
