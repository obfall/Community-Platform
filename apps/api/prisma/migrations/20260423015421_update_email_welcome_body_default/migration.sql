-- メンバー登録完了メール本文のデフォルトから結びの挨拶文を削除
-- 既に管理者が編集している場合は上書きしない（初期値のままの行のみ更新）

UPDATE "app_settings"
SET
  "value" = E'{{user_name}} 様\n\nこの度は {{site_name}} にご登録いただき、誠にありがとうございます。\n\nご登録メールアドレス: {{email}}',
  "updated_at" = NOW()
WHERE
  "key" = 'email_welcome_body'
  AND "value" = E'{{user_name}} 様\n\nこの度は {{site_name}} にご登録いただき、誠にありがとうございます。\n\nご登録メールアドレス: {{email}}\n\n今後ともどうぞよろしくお願いいたします。';
