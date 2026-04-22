-- コミュニティ設定: メール設定項目を追加
-- 差出人名 / 返信先アドレス / 登録完了メール件名 / 登録完了メール本文
-- 既存レコードがある場合はスキップする（ON CONFLICT DO NOTHING）

INSERT INTO "app_settings" ("id", "key", "value", "value_type", "description", "created_at", "updated_at")
VALUES (
  gen_random_uuid(),
  'email_from_name',
  'Community Platform',
  'string',
  'メール送信時の差出人名',
  NOW(),
  NOW()
)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "app_settings" ("id", "key", "value", "value_type", "description", "created_at", "updated_at")
VALUES (
  gen_random_uuid(),
  'email_reply_to',
  'noreply@example.com',
  'string',
  'メール送信時の返信先アドレス',
  NOW(),
  NOW()
)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "app_settings" ("id", "key", "value", "value_type", "description", "created_at", "updated_at")
VALUES (
  gen_random_uuid(),
  'email_welcome_subject',
  '【{{site_name}}】ご登録ありがとうございます',
  'string',
  'メンバー登録完了メールの件名',
  NOW(),
  NOW()
)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "app_settings" ("id", "key", "value", "value_type", "description", "created_at", "updated_at")
VALUES (
  gen_random_uuid(),
  'email_welcome_body',
  E'{{user_name}} 様\n\nこの度は {{site_name}} にご登録いただき、誠にありがとうございます。\n\nご登録メールアドレス: {{email}}\n\n今後ともどうぞよろしくお願いいたします。',
  'string',
  'メンバー登録完了メールの本文',
  NOW(),
  NOW()
)
ON CONFLICT ("key") DO NOTHING;
