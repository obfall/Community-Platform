-- Seed default permission settings for ec_shop feature.
-- create_product: 出品可能なロール（運営がメンバー販売を許可する場合は "member" を追加）
-- manage_all_products: 全商品の管理（非公開化など）を行えるロール
--
-- feature_settings に ec_shop 行が存在する時だけ INSERT する
-- （shadow database や未シード環境では feature_settings が空なので FK 違反を避ける）
INSERT INTO "permission_settings" ("id", "feature_key", "action", "allowed_roles", "created_at", "updated_at")
SELECT gen_random_uuid(), 'ec_shop', 'create_product', '["owner", "admin"]'::jsonb, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "feature_settings" WHERE "feature_key" = 'ec_shop')
ON CONFLICT ("feature_key", "action") DO NOTHING;

INSERT INTO "permission_settings" ("id", "feature_key", "action", "allowed_roles", "created_at", "updated_at")
SELECT gen_random_uuid(), 'ec_shop', 'manage_all_products', '["owner", "admin"]'::jsonb, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "feature_settings" WHERE "feature_key" = 'ec_shop')
ON CONFLICT ("feature_key", "action") DO NOTHING;
