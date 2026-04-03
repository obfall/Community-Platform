# コミュニティプラットフォーム テーブル定義書

| 項目         | 内容       |
| ------------ | ---------- |
| バージョン   | 2.0        |
| 作成日       | 2026-03-20 |
| データベース | PostgreSQL |
| ORM          | Prisma     |
| テーブル数   | 87         |
| モジュール数 | 23         |

---

## テーブル一覧サマリー

| #   | モジュール         | テーブル数 | テーブル名                                                                                                         |
| --- | ------------------ | ---------: | ------------------------------------------------------------------------------------------------------------------ |
| 1   | ユーザー・認証     |          5 | users, social_accounts, login_histories, refresh_tokens, password_reset_tokens                                     |
| 2   | コミュニティ管理   |          4 | feature_settings, member_ranks, permission_settings, app_settings                                                  |
| 3   | 通知               |          2 | notifications, notification_preferences                                                                            |
| 4   | イベント           |          6 | events, event_tickets, event_participants, event_speakers, event_organizations, event_tags                         |
| 5   | 掲示板             |          5 | board_posts, board_post_attachments, board_post_tags, board_comments, board_likes                                  |
| 6   | 動画               |          4 | videos, video_watch_progress, video_tasks, video_task_completions                                                  |
| 7   | チャット           |          3 | chat_rooms, chat_room_members, chat_messages                                                                       |
| 8   | メール配信         |          4 | mail_templates, mail_campaigns, mail_campaign_recipients, mail_suppressions                                        |
| 9   | プロジェクト       |          4 | projects, project_members, project_threads, project_thread_replies                                                 |
| 10  | EC・ショップ       |          9 | products, product_images, carts, cart_items, orders, order_items, payments, payment_refunds, product_subscriptions |
| 11  | ポイント           |          3 | point_balances, point_transactions, point_rules                                                                    |
| 12  | スキルシェア       |          4 | skill_listings, skill_bookings, skill_reviews, skill_messages                                                      |
| 13  | アンケート         |          4 | surveys, survey_questions, survey_responses, survey_answers                                                        |
| 14  | 広告               |          2 | advertisements, advertisement_events                                                                               |
| 15  | 外部連携           |          3 | line_user_connections, webhook_endpoints, webhook_deliveries                                                       |
| 16  | オリエンテーション |          2 | orientation_pages, orientation_completions                                                                         |
| 17  | アナリティクス     |          3 | activity_logs, engagement_scores, analytics_snapshots                                                              |
| 18  | モデレーション     |          3 | content_reports, moderation_actions, banned_words                                                                  |
| 19  | システム管理       |          3 | audit_logs, announcements, faq_articles                                                                            |
| 20  | 共通               |          3 | categories, tags, files                                                                                            |
|     | **合計**           |     **74** |                                                                                                                    |

---

## 設計方針

- **PK**: 全テーブル UUID（v7推奨）、`gen_random_uuid()` で自動生成
- **共通カラム**: `id`, `created_at`, `updated_at`
- **論理削除**: ユーザーコンテンツ系テーブルに `deleted_at` を設置
- **シングルコミュニティ設計**: 将来のマルチコミュニティ対応時は `community_id` カラム追加で拡張可能
- **機能区分（共通/オプション）**: 各機能モジュールを「共通」（常時有効・無効化不可）と「オプション」（システム管理者が有効/無効を切替）に分類し、`feature_settings` テーブルで管理。オプション機能が無効の場合、該当モジュールの画面・APIは非表示・アクセス拒否となる
- **タイムゾーン**: 全 TIMESTAMP に `WITH TIME ZONE`（TIMESTAMPTZ）を使用
- **パーティション**: 高ボリュームテーブル（activity_logs, audit_logs, chat_messages 等）は月次パーティション推奨
- **日本語全文検索**: pgroonga 拡張 + GIN インデックス
- **暗号化**: 2FA秘密鍵、外部サービスAPIキー等はアプリケーション層で AES-256-GCM 暗号化

---

## 1. ユーザー・認証

### 1-1. `users` — ユーザー

コミュニティのユーザーアカウント。ロール・ステータス・ランクを含む。

| カラム名          | 型           | 制約                                                                        | 説明                       |
| ----------------- | ------------ | --------------------------------------------------------------------------- | -------------------------- |
| id                | UUID         | PK, DEFAULT gen_random_uuid()                                               | ID                         |
| email             | VARCHAR(255) | NOT NULL, UNIQUE                                                            | メールアドレス             |
| password_hash     | VARCHAR(255) | NOT NULL                                                                    | パスワードハッシュ         |
| name              | VARCHAR(100) | NOT NULL                                                                    | 氏名                       |
| display_name      | VARCHAR(100) | NULL                                                                        | コミュニティ内表示名       |
| avatar_url        | VARCHAR(500) | NULL                                                                        | アバター画像URL            |
| bio               | TEXT         | NULL                                                                        | 自己紹介                   |
| phone             | VARCHAR(20)  | NULL                                                                        | 電話番号                   |
| role              | VARCHAR(20)  | NOT NULL, DEFAULT 'member', CHECK IN ('owner','admin','moderator','member') | コミュニティ内ロール       |
| status            | VARCHAR(20)  | NOT NULL, DEFAULT 'active', CHECK IN ('active','suspended','withdrawn')     | 会員ステータス             |
| rank_id           | UUID         | FK → member_ranks.id, NULL                                                  | 会員ランクID               |
| point_balance     | INTEGER      | NOT NULL, DEFAULT 0                                                         | ポイント残高（キャッシュ） |
| email_verified_at | TIMESTAMPTZ  | NULL                                                                        | メール認証日時             |
| is_admin          | BOOLEAN      | NOT NULL, DEFAULT FALSE                                                     | コミュニティ管理者フラグ   |
| is_active         | BOOLEAN      | NOT NULL, DEFAULT TRUE                                                      | 有効フラグ                 |
| last_login_at     | TIMESTAMPTZ  | NULL                                                                        | 最終ログイン日時           |
| joined_at         | TIMESTAMPTZ  | NULL                                                                        | コミュニティ参加日時       |
| created_at        | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                     | 作成日時                   |
| updated_at        | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                     | 更新日時                   |
| deleted_at        | TIMESTAMPTZ  | NULL                                                                        | 論理削除日時               |

**インデックス**: `idx_users_email` ON (email) WHERE deleted_at IS NULL, idx ON (role) WHERE deleted_at IS NULL, idx ON (status) WHERE deleted_at IS NULL

---

### 1-2. `social_accounts` — ソーシャルログイン連携

Google/Apple のソーシャルログイン連携情報。

| カラム名         | 型           | 制約                                  | 説明                           |
| ---------------- | ------------ | ------------------------------------- | ------------------------------ |
| id               | UUID         | PK, DEFAULT gen_random_uuid()         | ID                             |
| user_id          | UUID         | FK → users.id, NOT NULL               | ユーザーID                     |
| provider         | VARCHAR(20)  | NOT NULL, CHECK IN ('google','apple') | プロバイダー                   |
| provider_user_id | VARCHAR(255) | NOT NULL                              | プロバイダー側ユーザーID       |
| access_token     | TEXT         | NULL                                  | アクセストークン（暗号化）     |
| refresh_token    | TEXT         | NULL                                  | リフレッシュトークン（暗号化） |
| token_expires_at | TIMESTAMPTZ  | NULL                                  | トークン有効期限               |
| created_at       | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()               | 作成日時                       |
| updated_at       | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()               | 更新日時                       |

**インデックス**: UNIQUE ON (provider, provider_user_id), idx ON (user_id)

---

### 1-3. `login_histories` — ログイン履歴

ログイン試行の履歴。不正ログイン検知にも使用。

| カラム名       | 型          | 制約                                     | 説明         |
| -------------- | ----------- | ---------------------------------------- | ------------ |
| id             | UUID        | PK, DEFAULT gen_random_uuid()            | ID           |
| user_id        | UUID        | FK → users.id, NOT NULL                  | ユーザーID   |
| ip_address     | INET        | NOT NULL                                 | IPアドレス   |
| user_agent     | TEXT        | NULL                                     | User-Agent   |
| status         | VARCHAR(10) | NOT NULL, CHECK IN ('success','failure') | ログイン結果 |
| failure_reason | VARCHAR(50) | NULL                                     | 失敗理由     |
| created_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                  | 作成日時     |

**インデックス**: idx ON (user_id, created_at DESC)

---

### 1-4. `refresh_tokens` — リフレッシュトークン

JWT リフレッシュトークンの管理。

| カラム名    | 型           | 制約                          | 説明             |
| ----------- | ------------ | ----------------------------- | ---------------- |
| id          | UUID         | PK, DEFAULT gen_random_uuid() | ID               |
| user_id     | UUID         | FK → users.id, NOT NULL       | ユーザーID       |
| token_hash  | VARCHAR(255) | NOT NULL, UNIQUE              | トークンハッシュ |
| device_info | VARCHAR(255) | NULL                          | デバイス情報     |
| ip_address  | INET         | NULL                          | IPアドレス       |
| expires_at  | TIMESTAMPTZ  | NOT NULL                      | 有効期限         |
| revoked_at  | TIMESTAMPTZ  | NULL                          | 無効化日時       |
| created_at  | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 作成日時         |

**インデックス**: idx ON (token_hash) WHERE revoked_at IS NULL, idx ON (user_id)

---

### 1-5. `password_reset_tokens` — パスワードリセットトークン

| カラム名   | 型           | 制約                          | 説明             |
| ---------- | ------------ | ----------------------------- | ---------------- |
| id         | UUID         | PK, DEFAULT gen_random_uuid() | ID               |
| user_id    | UUID         | FK → users.id, NOT NULL       | ユーザーID       |
| token_hash | VARCHAR(255) | NOT NULL, UNIQUE              | トークンハッシュ |
| expires_at | TIMESTAMPTZ  | NOT NULL                      | 有効期限         |
| used_at    | TIMESTAMPTZ  | NULL                          | 使用日時         |
| created_at | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 作成日時         |

**インデックス**: idx ON (token_hash) WHERE used_at IS NULL

---

## 2. コミュニティ管理

### 2-1. `feature_settings` — 機能設定

機能モジュールの有効/無効を管理する。各機能は「共通（common）」または「オプション（optional）」に分類される。
共通機能は常に有効で無効化できない。オプション機能はシステム管理者が有効/無効を切り替える。

| カラム名           | 型           | 制約                                     | 説明                                                                                                                                                                                  |
| ------------------ | ------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                 | UUID         | PK, DEFAULT gen_random_uuid()            | ID                                                                                                                                                                                    |
| feature_key        | VARCHAR(50)  | NOT NULL, UNIQUE                         | 機能キー（例: auth, news, event, board, video, chat, project, ec_shop, point, skill_share, survey, advertising, mail_campaign, line_integration, orientation, analytics, moderation） |
| feature_name       | VARCHAR(100) | NOT NULL                                 | 機能表示名（例: ログイン・認証, イベント, 掲示板, EC・ショップ）                                                                                                                      |
| category           | VARCHAR(20)  | NOT NULL, CHECK IN ('common','optional') | 機能区分（common: 共通＝常時有効, optional: オプション＝管理者切替）                                                                                                                  |
| is_enabled         | BOOLEAN      | NOT NULL, DEFAULT TRUE                   | 有効フラグ（common は常に TRUE、optional は管理者が切替）                                                                                                                             |
| description        | TEXT         | NULL                                     | 機能の説明                                                                                                                                                                            |
| sort_order         | INTEGER      | NOT NULL, DEFAULT 0                      | 管理画面での表示順                                                                                                                                                                    |
| enabled_at         | TIMESTAMPTZ  | NULL                                     | 最終有効化日時                                                                                                                                                                        |
| disabled_at        | TIMESTAMPTZ  | NULL                                     | 最終無効化日時                                                                                                                                                                        |
| updated_by_user_id | UUID         | FK → users.id, NULL                      | 更新者ユーザーID                                                                                                                                                                      |
| created_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                  | 作成日時                                                                                                                                                                              |
| updated_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                  | 更新日時                                                                                                                                                                              |

**インデックス**: idx ON (category), idx ON (is_enabled)

**初期シードデータ例**:

| feature_key      | feature_name       | category |
| ---------------- | ------------------ | -------- |
| auth             | ログイン・認証     | common   |
| news             | 新着情報           | common   |
| notification     | 通知               | common   |
| member           | メンバー           | common   |
| moderation       | モデレーション     | common   |
| event            | イベント           | optional |
| board            | 掲示板             | optional |
| video            | 動画               | optional |
| chat             | チャット           | optional |
| project          | プロジェクト       | optional |
| ec_shop          | EC・ショップ       | optional |
| point            | ポイント           | optional |
| skill_share      | スキルシェア       | optional |
| survey           | アンケート         | optional |
| advertising      | 広告               | optional |
| mail_campaign    | メール配信         | optional |
| line_integration | LINE連携           | optional |
| orientation      | オリエンテーション | optional |
| analytics        | アナリティクス     | optional |

> **備考**: 上記は初期値の例。共通/オプションの分類は要件に応じて調整可能。アプリケーション層で `category = 'common'` の行は `is_enabled = FALSE` への更新を拒否する。

---

### 2-2. `member_ranks` — 会員ランク定義

メンバーのランク定義（一般、VIP、プレミアム等）。

| カラム名   | 型          | 制約                          | 説明                   |
| ---------- | ----------- | ----------------------------- | ---------------------- |
| id         | UUID        | PK, DEFAULT gen_random_uuid() | ID                     |
| name       | VARCHAR(50) | NOT NULL                      | ランク名               |
| slug       | VARCHAR(50) | NOT NULL, UNIQUE              | スラッグ               |
| color      | VARCHAR(7)  | NULL                          | バッジカラー           |
| sort_order | INTEGER     | NOT NULL, DEFAULT 0           | 表示順                 |
| is_default | BOOLEAN     | NOT NULL, DEFAULT FALSE       | デフォルトランクフラグ |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 作成日時               |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 更新日時               |

**インデックス**: idx ON (sort_order)

---

### 2-3. `permission_settings` — 権限設定

機能モジュール内のアクション別権限設定。`feature_key` で `feature_settings` と紐付き、
該当モジュールが無効（`is_enabled = FALSE`）の場合は権限設定自体が無効となる。

| カラム名         | 型          | 制約                                        | 説明                                                   |
| ---------------- | ----------- | ------------------------------------------- | ------------------------------------------------------ |
| id               | UUID        | PK, DEFAULT gen_random_uuid()               | ID                                                     |
| feature_key      | VARCHAR(50) | FK → feature_settings.feature_key, NOT NULL | 所属機能モジュール（例: board, event, project）        |
| action           | VARCHAR(50) | NOT NULL                                    | アクション名（例: create, edit, delete, view, export） |
| allowed_roles    | JSONB       | NOT NULL, DEFAULT '["owner","admin"]'       | 許可ロール配列                                         |
| required_rank_id | UUID        | FK → member_ranks.id, NULL                  | 必要最低ランクID                                       |
| created_at       | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                     | 作成日時                                               |
| updated_at       | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                     | 更新日時                                               |

**ユニーク制約**: UNIQUE (feature_key, action)

**インデックス**: idx ON (feature_key)

---

### 2-4. `app_settings` — アプリケーション設定

アプリケーション・コミュニティ全体の設定。

| カラム名           | 型           | 制約                                                                       | 説明             |
| ------------------ | ------------ | -------------------------------------------------------------------------- | ---------------- |
| id                 | UUID         | PK, DEFAULT gen_random_uuid()                                              | ID               |
| key                | VARCHAR(100) | NOT NULL, UNIQUE                                                           | 設定キー         |
| value              | TEXT         | NOT NULL                                                                   | 設定値           |
| value_type         | VARCHAR(10)  | NOT NULL, DEFAULT 'string', CHECK IN ('string','integer','boolean','json') | 値の型           |
| description        | TEXT         | NULL                                                                       | 説明             |
| updated_by_user_id | UUID         | FK → users.id, NULL                                                        | 更新者ユーザーID |
| created_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                    | 作成日時         |
| updated_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                    | 更新日時         |

---

## 3. 通知

### 3-1. `notifications` — 通知

| カラム名       | 型           | 制約                          | 説明                                                                                          |
| -------------- | ------------ | ----------------------------- | --------------------------------------------------------------------------------------------- |
| id             | UUID         | PK, DEFAULT gen_random_uuid() | ID                                                                                            |
| user_id        | UUID         | FK → users.id, NOT NULL       | 通知先ユーザーID                                                                              |
| type           | VARCHAR(30)  | NOT NULL                      | 通知種別（event_created, board_post, board_comment, chat_message, point_received, system 等） |
| title          | VARCHAR(200) | NOT NULL                      | タイトル                                                                                      |
| body           | TEXT         | NULL                          | 本文                                                                                          |
| reference_type | VARCHAR(30)  | NULL                          | 参照先種別（event, board_post, chat_room 等）                                                 |
| reference_id   | UUID         | NULL                          | 参照先ID                                                                                      |
| actor_user_id  | UUID         | FK → users.id, NULL           | アクション実行者ユーザーID                                                                    |
| is_read        | BOOLEAN      | NOT NULL, DEFAULT FALSE       | 既読フラグ                                                                                    |
| read_at        | TIMESTAMPTZ  | NULL                          | 既読日時                                                                                      |
| created_at     | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 作成日時                                                                                      |

**インデックス**: idx ON (user_id, is_read, created_at DESC)

---

### 3-2. `notification_preferences` — 通知設定

| カラム名          | 型          | 制約                          | 説明         |
| ----------------- | ----------- | ----------------------------- | ------------ |
| id                | UUID        | PK, DEFAULT gen_random_uuid() | ID           |
| user_id           | UUID        | FK → users.id, NOT NULL       | ユーザーID   |
| notification_type | VARCHAR(30) | NOT NULL                      | 通知種別     |
| email_enabled     | BOOLEAN     | NOT NULL, DEFAULT TRUE        | メール通知   |
| in_app_enabled    | BOOLEAN     | NOT NULL, DEFAULT TRUE        | アプリ内通知 |
| line_enabled      | BOOLEAN     | NOT NULL, DEFAULT FALSE       | LINE通知     |
| created_at        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 作成日時     |
| updated_at        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 更新日時     |

**インデックス**: UNIQUE ON (user_id, notification_type)

---

## 4. イベント

### 4-1. `events` — イベント

イベント告知・募集管理。3ステップ構成（基本情報 → チケット → 詳細情報）で作成。施設・会場とオンラインの両形態をサポート。

| カラム名                    | 型           | 制約                                                                                   | 説明                                                      |
| --------------------------- | ------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| id                          | UUID         | PK, DEFAULT gen_random_uuid()                                                          | ID                                                        |
| title                       | VARCHAR(200) | NOT NULL                                                                               | イベントタイトル                                          |
| description                 | TEXT         | NULL                                                                                   | 概要                                                      |
| location_type               | VARCHAR(10)  | NOT NULL, DEFAULT 'venue', CHECK IN ('venue','online','hybrid')                        | 開催形態（施設・会場 / オンライン / ハイブリッド）        |
| venue_id                    | UUID         | FK → venues.id, NULL                                                                   | 施設・会場ID（登録済み施設を選択した場合）                |
| venue_name                  | VARCHAR(300) | NULL                                                                                   | 開催場所名（施設・会場名）                                |
| venue_address               | VARCHAR(500) | NULL                                                                                   | 開催場所の住所                                            |
| online_url                  | VARCHAR(500) | NULL                                                                                   | オンライン参加URL（Zoom等）                               |
| start_at                    | TIMESTAMPTZ  | NOT NULL                                                                               | 開始日時                                                  |
| end_at                      | TIMESTAMPTZ  | NOT NULL                                                                               | 終了日時                                                  |
| registration_deadline_at    | TIMESTAMPTZ  | NULL                                                                                   | 申し込み締め切り日時                                      |
| ticket_sale_start_at        | TIMESTAMPTZ  | NULL                                                                                   | チケット販売開始日時                                      |
| allow_multi_ticket_purchase | BOOLEAN      | NOT NULL, DEFAULT FALSE                                                                | 1回の購入で複数種類チケットの購入を許可                   |
| planning_role               | VARCHAR(30)  | NOT NULL, DEFAULT '主催'                                                               | 企画における役割（主催, 共催, 後援, 協賛, 協力, 運営 等） |
| event_type                  | VARCHAR(30)  | NULL                                                                                   | イベント種別（講演, セミナー, ワークショップ, 交流会 等） |
| category_id                 | UUID         | FK → categories.id, NULL                                                               | カテゴリID                                                |
| access_info                 | TEXT         | NULL                                                                                   | 会場へのアクセス                                          |
| participation_method        | TEXT         | NULL                                                                                   | 参加方法                                                  |
| contact_info                | TEXT         | NULL                                                                                   | 問合せ先                                                  |
| cancellation_policy         | TEXT         | NULL                                                                                   | キャンセルポリシー                                        |
| language                    | VARCHAR(20)  | NULL, DEFAULT 'ja'                                                                     | 使用言語                                                  |
| is_attendee_visible         | BOOLEAN      | NOT NULL, DEFAULT FALSE                                                                | イベント参加者相互参照（参加者同士がお互いを確認可能）    |
| status                      | VARCHAR(20)  | NOT NULL, DEFAULT 'draft', CHECK IN ('draft','recruiting','closed','canceled','ended') | ステータス                                                |
| cover_image_url             | VARCHAR(500) | NULL                                                                                   | カバー画像URL                                             |
| created_by_user_id          | UUID         | FK → users.id, NOT NULL                                                                | 作成者ユーザーID                                          |
| required_rank_id            | UUID         | FK → member_ranks.id, NULL                                                             | 参加必要ランクID                                          |
| participant_count           | INTEGER      | NOT NULL, DEFAULT 0                                                                    | 参加者数（キャッシュ）                                    |
| is_calendar_visible         | BOOLEAN      | NOT NULL, DEFAULT TRUE                                                                 | カレンダー表示フラグ                                      |
| created_at                  | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                                | 作成日時                                                  |
| updated_at                  | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                                | 更新日時                                                  |
| deleted_at                  | TIMESTAMPTZ  | NULL                                                                                   | 論理削除日時                                              |

**インデックス**: idx ON (status, start_at), idx ON (start_at), idx ON (created_by_user_id), idx ON (registration_deadline_at), idx ON (category_id), idx ON (event_type), idx ON (venue_id)

---

### 4-2. `event_tickets` — イベントチケット種別

1イベントに対して複数のチケット種別を登録可能（例: 一般チケット、VIPチケット、早割チケット等）。

| カラム名       | 型           | 制約                          | 説明                                       |
| -------------- | ------------ | ----------------------------- | ------------------------------------------ |
| id             | UUID         | PK, DEFAULT gen_random_uuid() | ID                                         |
| event_id       | UUID         | FK → events.id, NOT NULL      | イベントID                                 |
| ticket_name    | VARCHAR(100) | NOT NULL                      | チケット名                                 |
| price          | INTEGER      | NOT NULL, DEFAULT 0           | 参加費                                     |
| currency       | VARCHAR(3)   | NOT NULL, DEFAULT 'JPY'       | 通貨（ISO 4217）                           |
| capacity       | INTEGER      | NULL                          | 定員（NULLは無制限）                       |
| purchase_limit | INTEGER      | NOT NULL, DEFAULT 1           | 一回の購入制限（1人が1回で買える枚数上限） |
| sort_order     | INTEGER      | NOT NULL, DEFAULT 0           | 表示順                                     |
| is_active      | BOOLEAN      | NOT NULL, DEFAULT TRUE        | 販売有効フラグ                             |
| sold_count     | INTEGER      | NOT NULL, DEFAULT 0           | 販売済数（キャッシュ）                     |
| created_at     | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 作成日時                                   |
| updated_at     | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 更新日時                                   |

**インデックス**: idx ON (event_id, sort_order)

---

### 4-3. `event_participants` — イベント参加者

| カラム名       | 型          | 制約                                                                                          | 説明               |
| -------------- | ----------- | --------------------------------------------------------------------------------------------- | ------------------ |
| id             | UUID        | PK, DEFAULT gen_random_uuid()                                                                 | ID                 |
| event_id       | UUID        | FK → events.id, NOT NULL                                                                      | イベントID         |
| user_id        | UUID        | FK → users.id, NOT NULL                                                                       | ユーザーID         |
| ticket_id      | UUID        | FK → event_tickets.id, NULL                                                                   | 購入チケット種別ID |
| quantity       | INTEGER     | NOT NULL, DEFAULT 1                                                                           | 購入枚数           |
| status         | VARCHAR(20) | NOT NULL, DEFAULT 'applied', CHECK IN ('applied','confirmed','canceled','attended','no_show') | 参加ステータス     |
| payment_status | VARCHAR(20) | NULL, CHECK IN ('pending','paid','refunded')                                                  | 決済ステータス     |
| payment_id     | UUID        | FK → payments.id, NULL                                                                        | 決済ID             |
| applied_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                                                       | 申込日時           |
| canceled_at    | TIMESTAMPTZ | NULL                                                                                          | キャンセル日時     |
| created_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                                                       | 作成日時           |
| updated_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                                                       | 更新日時           |

**インデックス**: UNIQUE ON (event_id, user_id, ticket_id), idx ON (user_id), idx ON (event_id, status)

---

### 4-4. `event_speakers` — イベント登壇者

イベントの登壇者情報。1イベントに対して複数登録可能。

| カラム名   | 型           | 制約                          | 説明                                                                          |
| ---------- | ------------ | ----------------------------- | ----------------------------------------------------------------------------- |
| id         | UUID         | PK, DEFAULT gen_random_uuid() | ID                                                                            |
| event_id   | UUID         | FK → events.id, NOT NULL      | イベントID                                                                    |
| name       | VARCHAR(100) | NOT NULL                      | 登壇者氏名                                                                    |
| title      | VARCHAR(100) | NULL                          | 肩書 / 職業                                                                   |
| role       | VARCHAR(30)  | NOT NULL                      | 登壇者の役割（基調講演, パネリスト, モデレーター, ゲストスピーカー, 講師 等） |
| sort_order | INTEGER      | NOT NULL, DEFAULT 0           | 表示順                                                                        |
| created_at | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 作成日時                                                                      |
| updated_at | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 更新日時                                                                      |

**インデックス**: idx ON (event_id, sort_order)

> **備考**: `events.planning_role` と `event_organizations.role` はプルダウン選択肢Aを共用（主催, 共催, 後援, 協賛, 協力, 運営 等）。`event_speakers.role` は別の選択肢B（基調講演, パネリスト, モデレーター, ゲストスピーカー, 講師 等）。

---

### 4-5. `event_organizations` — イベント関係団体

イベントに関わる団体・企業の情報。1イベントに対して複数登録可能。

| カラム名          | 型           | 制約                          | 説明                                                    |
| ----------------- | ------------ | ----------------------------- | ------------------------------------------------------- |
| id                | UUID         | PK, DEFAULT gen_random_uuid() | ID                                                      |
| event_id          | UUID         | FK → events.id, NOT NULL      | イベントID                                              |
| organization_name | VARCHAR(200) | NOT NULL                      | 関係団体社名                                            |
| role              | VARCHAR(30)  | NOT NULL                      | 関係団体の役割（主催, 共催, 後援, 協賛, 協力, 運営 等） |
| sort_order        | INTEGER      | NOT NULL, DEFAULT 0           | 表示順                                                  |
| created_at        | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 作成日時                                                |
| updated_at        | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 更新日時                                                |

**インデックス**: idx ON (event_id, sort_order)

---

### 4-6. `event_tags` — イベントタグ関連

イベントとタグの中間テーブル。検索用キーワードとして使用。`board_post_tags` と同パターン。

| カラム名 | 型   | 制約                      | 説明       |
| -------- | ---- | ------------------------- | ---------- |
| event_id | UUID | PK (複合), FK → events.id | イベントID |
| tag_id   | UUID | PK (複合), FK → tags.id   | タグID     |

**インデックス**: idx ON (tag_id)

---

## 5. 掲示板

### 5-1. `board_posts` — 掲示板投稿（トピック）

トピックの作成・管理。概要はリッチテキスト（HTML形式）で画像・絵文字・太文字等を本文中に埋め込み可能。閲覧制限・投稿制限対応。

| カラム名         | 型           | 制約                                                                 | 説明                                                           |
| ---------------- | ------------ | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| id               | UUID         | PK, DEFAULT gen_random_uuid()                                        | ID                                                             |
| category_id      | UUID         | FK → categories.id, NULL                                             | カテゴリID                                                     |
| author_user_id   | UUID         | FK → users.id, NOT NULL                                              | 投稿者ユーザーID                                               |
| language         | VARCHAR(20)  | NULL, DEFAULT 'ja'                                                   | 使用言語                                                       |
| title            | VARCHAR(200) | NOT NULL                                                             | タイトル                                                       |
| body             | TEXT         | NOT NULL                                                             | 概要（リッチテキスト: HTML形式。画像・絵文字・太文字等を含む） |
| publish_status   | VARCHAR(20)  | NOT NULL, DEFAULT 'draft', CHECK IN ('draft','published','archived') | 公開ステータス                                                 |
| sort_order       | INTEGER      | NOT NULL, DEFAULT 0                                                  | 表示順（カテゴリー内の並び替え用）                             |
| is_pinned        | BOOLEAN      | NOT NULL, DEFAULT FALSE                                              | ピン留めフラグ                                                 |
| view_count       | INTEGER      | NOT NULL, DEFAULT 0                                                  | 閲覧数                                                         |
| comment_count    | INTEGER      | NOT NULL, DEFAULT 0                                                  | コメント数（キャッシュ）                                       |
| like_count       | INTEGER      | NOT NULL, DEFAULT 0                                                  | いいね数（キャッシュ）                                         |
| view_permission  | VARCHAR(20)  | NOT NULL, DEFAULT 'all', CHECK IN ('all','rank_restricted')          | 閲覧権限                                                       |
| required_rank_id | UUID         | FK → member_ranks.id, NULL                                           | 閲覧必要ランクID                                               |
| created_at       | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                              | 作成日時                                                       |
| updated_at       | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                              | 更新日時                                                       |
| deleted_at       | TIMESTAMPTZ  | NULL                                                                 | 論理削除日時                                                   |

**インデックス**: idx ON (publish_status, is_pinned DESC, sort_order, created_at DESC) WHERE deleted_at IS NULL, idx ON (category_id, sort_order, created_at DESC), idx ON (author_user_id)

---

### 5-2. `board_post_attachments` — 投稿添付ファイル

トピックへの添付ファイル（PDF、ドキュメント等）。画像はリッチテキスト本文に埋め込まれるため、ここでは本文外のファイル添付を管理する。

| カラム名   | 型          | 制約                          | 説明       |
| ---------- | ----------- | ----------------------------- | ---------- |
| id         | UUID        | PK, DEFAULT gen_random_uuid() | ID         |
| post_id    | UUID        | FK → board_posts.id, NOT NULL | 投稿ID     |
| file_id    | UUID        | FK → files.id, NOT NULL       | ファイルID |
| sort_order | INTEGER     | NOT NULL, DEFAULT 0           | 表示順     |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 作成日時   |

**インデックス**: idx ON (post_id, sort_order)

---

### 5-3. `board_post_tags` — 投稿タグ関連

| カラム名 | 型   | 制約                           | 説明   |
| -------- | ---- | ------------------------------ | ------ |
| post_id  | UUID | PK (複合), FK → board_posts.id | 投稿ID |
| tag_id   | UUID | PK (複合), FK → tags.id        | タグID |

**インデックス**: idx ON (tag_id)

---

### 5-4. `board_comments` — コメント

ネスト構造対応（parent_comment_id による自己参照）。

| カラム名          | 型          | 制約                          | 説明                     |
| ----------------- | ----------- | ----------------------------- | ------------------------ |
| id                | UUID        | PK, DEFAULT gen_random_uuid() | ID                       |
| post_id           | UUID        | FK → board_posts.id, NOT NULL | 投稿ID                   |
| author_user_id    | UUID        | FK → users.id, NOT NULL       | コメント者ユーザーID     |
| parent_comment_id | UUID        | FK → board_comments.id, NULL  | 親コメントID（ネスト用） |
| body              | TEXT        | NOT NULL                      | コメント本文             |
| like_count        | INTEGER     | NOT NULL, DEFAULT 0           | いいね数（キャッシュ）   |
| created_at        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 作成日時                 |
| updated_at        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 更新日時                 |
| deleted_at        | TIMESTAMPTZ | NULL                          | 論理削除日時             |

**インデックス**: idx ON (post_id, created_at) WHERE deleted_at IS NULL, idx ON (parent_comment_id), idx ON (author_user_id)

---

### 5-5. `board_likes` — いいね

投稿・コメントへの「いいね」。ポリモーフィック参照。

| カラム名    | 型          | 制約                                              | 説明       |
| ----------- | ----------- | ------------------------------------------------- | ---------- |
| id          | UUID        | PK, DEFAULT gen_random_uuid()                     | ID         |
| user_id     | UUID        | FK → users.id, NOT NULL                           | ユーザーID |
| target_type | VARCHAR(20) | NOT NULL, CHECK IN ('board_post','board_comment') | 対象種別   |
| target_id   | UUID        | NOT NULL                                          | 対象ID     |
| created_at  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                           | 作成日時   |

**インデックス**: UNIQUE ON (user_id, target_type, target_id), idx ON (target_type, target_id)

---

## 6. 動画

### 6-1. `videos` — 動画

動画管理。カテゴリ分け、閲覧制限、視聴トラッキング対応。

| カラム名           | 型           | 制約                                                        | 説明                 |
| ------------------ | ------------ | ----------------------------------------------------------- | -------------------- |
| id                 | UUID         | PK, DEFAULT gen_random_uuid()                               | ID                   |
| category_id        | UUID         | FK → categories.id, NULL                                    | カテゴリID           |
| title              | VARCHAR(200) | NOT NULL                                                    | タイトル             |
| description        | TEXT         | NULL                                                        | 説明                 |
| video_url          | VARCHAR(500) | NOT NULL                                                    | 動画URL              |
| thumbnail_url      | VARCHAR(500) | NULL                                                        | サムネイルURL        |
| duration_seconds   | INTEGER      | NULL                                                        | 動画の長さ（秒）     |
| view_permission    | VARCHAR(20)  | NOT NULL, DEFAULT 'all', CHECK IN ('all','rank_restricted') | 閲覧権限             |
| required_rank_id   | UUID         | FK → member_ranks.id, NULL                                  | 閲覧必要ランクID     |
| is_published       | BOOLEAN      | NOT NULL, DEFAULT FALSE                                     | 公開フラグ           |
| sort_order         | INTEGER      | NOT NULL, DEFAULT 0                                         | 表示順               |
| view_count         | INTEGER      | NOT NULL, DEFAULT 0                                         | 視聴数（キャッシュ） |
| created_by_user_id | UUID         | FK → users.id, NOT NULL                                     | 作成者ユーザーID     |
| created_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                     | 作成日時             |
| updated_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                     | 更新日時             |
| deleted_at         | TIMESTAMPTZ  | NULL                                                        | 論理削除日時         |

**インデックス**: idx ON (is_published, sort_order) WHERE deleted_at IS NULL, idx ON (category_id)

---

### 6-2. `video_watch_progress` — 動画視聴進捗

誰がどの動画をどこまで視聴したか。

| カラム名              | 型          | 制約                          | 説明                         |
| --------------------- | ----------- | ----------------------------- | ---------------------------- |
| id                    | UUID        | PK, DEFAULT gen_random_uuid() | ID                           |
| video_id              | UUID        | FK → videos.id, NOT NULL      | 動画ID                       |
| user_id               | UUID        | FK → users.id, NOT NULL       | ユーザーID                   |
| watched_seconds       | INTEGER     | NOT NULL, DEFAULT 0           | 視聴済み秒数                 |
| total_seconds         | INTEGER     | NOT NULL                      | 動画の総秒数                 |
| is_completed          | BOOLEAN     | NOT NULL, DEFAULT FALSE       | 視聴完了フラグ               |
| last_position_seconds | INTEGER     | NOT NULL, DEFAULT 0           | 最終再生位置（レジューム用） |
| completed_at          | TIMESTAMPTZ | NULL                          | 完了日時                     |
| last_watched_at       | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 最終視聴日時                 |
| created_at            | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 作成日時                     |
| updated_at            | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 更新日時                     |

**インデックス**: UNIQUE ON (video_id, user_id), idx ON (user_id)

---

### 6-3. `video_tasks` — 動画関連タスク/ワーク

動画視聴後のワーク・TODO設定。

| カラム名    | 型           | 制約                          | 説明           |
| ----------- | ------------ | ----------------------------- | -------------- |
| id          | UUID         | PK, DEFAULT gen_random_uuid() | ID             |
| video_id    | UUID         | FK → videos.id, NOT NULL      | 動画ID         |
| title       | VARCHAR(200) | NOT NULL                      | タスクタイトル |
| description | TEXT         | NULL                          | タスク説明     |
| sort_order  | INTEGER      | NOT NULL, DEFAULT 0           | 表示順         |
| created_at  | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 作成日時       |
| updated_at  | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 更新日時       |

**インデックス**: idx ON (video_id, sort_order)

---

### 6-4. `video_task_completions` — タスク完了記録

| カラム名      | 型          | 制約                          | 説明         |
| ------------- | ----------- | ----------------------------- | ------------ |
| id            | UUID        | PK, DEFAULT gen_random_uuid() | ID           |
| video_task_id | UUID        | FK → video_tasks.id, NOT NULL | 動画タスクID |
| user_id       | UUID        | FK → users.id, NOT NULL       | ユーザーID   |
| completed_at  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 完了日時     |
| created_at    | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 作成日時     |

**インデックス**: UNIQUE ON (video_task_id, user_id), idx ON (user_id)

---

## 7. チャット

### 7-1. `chat_rooms` — チャットルーム

DM（1対1）のルーム管理。

| カラム名        | 型          | 制約                          | 説明               |
| --------------- | ----------- | ----------------------------- | ------------------ |
| id              | UUID        | PK, DEFAULT gen_random_uuid() | ID                 |
| last_message_at | TIMESTAMPTZ | NULL                          | 最終メッセージ日時 |
| created_at      | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 作成日時           |
| updated_at      | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 更新日時           |

**インデックス**: idx ON (last_message_at DESC)

---

### 7-2. `chat_room_members` — チャットルームメンバー

| カラム名     | 型          | 制約                          | 説明             |
| ------------ | ----------- | ----------------------------- | ---------------- |
| id           | UUID        | PK, DEFAULT gen_random_uuid() | ID               |
| chat_room_id | UUID        | FK → chat_rooms.id, NOT NULL  | チャットルームID |
| user_id      | UUID        | FK → users.id, NOT NULL       | ユーザーID       |
| last_read_at | TIMESTAMPTZ | NULL                          | 最終既読日時     |
| is_muted     | BOOLEAN     | NOT NULL, DEFAULT FALSE       | ミュートフラグ   |
| joined_at    | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 参加日時         |
| created_at   | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 作成日時         |

**インデックス**: UNIQUE ON (chat_room_id, user_id), idx ON (user_id)

---

### 7-3. `chat_messages` — チャットメッセージ

| カラム名       | 型          | 制約                                                       | 説明             |
| -------------- | ----------- | ---------------------------------------------------------- | ---------------- |
| id             | UUID        | PK, DEFAULT gen_random_uuid()                              | ID               |
| chat_room_id   | UUID        | FK → chat_rooms.id, NOT NULL                               | チャットルームID |
| sender_user_id | UUID        | FK → users.id, NOT NULL                                    | 送信者ユーザーID |
| message_type   | VARCHAR(10) | NOT NULL, DEFAULT 'text', CHECK IN ('text','image','file') | メッセージ種別   |
| body           | TEXT        | NULL                                                       | メッセージ本文   |
| file_id        | UUID        | FK → files.id, NULL                                        | 添付ファイルID   |
| created_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                    | 作成日時         |
| updated_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                    | 更新日時         |
| deleted_at     | TIMESTAMPTZ | NULL                                                       | 論理削除日時     |

**インデックス**: idx ON (chat_room_id, created_at DESC), idx ON (sender_user_id)

**備考**: 月次パーティション推奨（created_at 基準）

---

## 8. メール配信

### 8-1. `mail_messages` — メールメッセージ

| カラム名           | 型           | 制約                                                                                | 説明                                                   |
| ------------------ | ------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| id                 | UUID         | PK, DEFAULT gen_random_uuid()                                                       | ID                                                     |
| subject            | VARCHAR(200) | NOT NULL                                                                            | 件名                                                   |
| body_html          | TEXT         | NOT NULL                                                                            | HTML本文                                               |
| body_text          | TEXT         | NULL                                                                                | テキスト本文                                           |
| target_type        | VARCHAR(20)  | NOT NULL, CHECK IN ('all','rank','custom')                                          | 配信対象種別                                           |
| target_filter      | JSONB        | NULL                                                                                | 配信先フィルタ条件（ロール・ランク等の絞り込みに使用） |
| status             | VARCHAR(20)  | NOT NULL, DEFAULT 'draft', CHECK IN ('draft','scheduled','sending','sent','failed') | ステータス                                             |
| scheduled_at       | TIMESTAMPTZ  | NULL                                                                                | 配信予定日時                                           |
| sent_at            | TIMESTAMPTZ  | NULL                                                                                | 配信完了日時                                           |
| total_recipients   | INTEGER      | NOT NULL, DEFAULT 0                                                                 | 配信先総数                                             |
| sent_count         | INTEGER      | NOT NULL, DEFAULT 0                                                                 | 送信済数                                               |
| open_count         | INTEGER      | NOT NULL, DEFAULT 0                                                                 | 開封数                                                 |
| click_count        | INTEGER      | NOT NULL, DEFAULT 0                                                                 | クリック数                                             |
| bounce_count       | INTEGER      | NOT NULL, DEFAULT 0                                                                 | バウンス数                                             |
| created_by_user_id | UUID         | FK → users.id, NOT NULL                                                             | 作成者ユーザーID                                       |
| created_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                             | 作成日時                                               |
| updated_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                             | 更新日時                                               |

**インデックス**: idx ON (status, created_at DESC)

---

### 8-2. `mail_message_recipients` — 配信先

| カラム名   | 型           | 制約                                                                                                       | 説明           |
| ---------- | ------------ | ---------------------------------------------------------------------------------------------------------- | -------------- |
| id         | UUID         | PK, DEFAULT gen_random_uuid()                                                                              | ID             |
| message_id | UUID         | FK → mail_messages.id, NOT NULL                                                                            | メッセージID   |
| user_id    | UUID         | FK → users.id, NOT NULL                                                                                    | ユーザーID     |
| email      | VARCHAR(255) | NOT NULL                                                                                                   | メールアドレス |
| status     | VARCHAR(20)  | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','sent','delivered','bounced','opened','clicked','failed') | 配信ステータス |
| sent_at    | TIMESTAMPTZ  | NULL                                                                                                       | 送信日時       |
| opened_at  | TIMESTAMPTZ  | NULL                                                                                                       | 開封日時       |
| clicked_at | TIMESTAMPTZ  | NULL                                                                                                       | クリック日時   |
| created_at | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                                                    | 作成日時       |

**インデックス**: idx ON (message_id, status), UNIQUE ON (message_id, user_id)

---

### 8-3. `mail_message_attachments` — 配信添付ファイル

| カラム名   | 型          | 制約                            | 説明         |
| ---------- | ----------- | ------------------------------- | ------------ |
| id         | UUID        | PK, DEFAULT gen_random_uuid()   | ID           |
| message_id | UUID        | FK → mail_messages.id, NOT NULL | メッセージID |
| file_id    | UUID        | FK → files.id, NOT NULL         | ファイルID   |
| sort_order | INTEGER     | NOT NULL, DEFAULT 0             | 表示順       |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()         | 作成日時     |

**インデックス**: idx ON (message_id, sort_order)

---

### 8-4. `mail_suppressions` — 配信停止リスト

| カラム名   | 型           | 制約                                                             | 説明           |
| ---------- | ------------ | ---------------------------------------------------------------- | -------------- |
| id         | UUID         | PK, DEFAULT gen_random_uuid()                                    | ID             |
| email      | VARCHAR(255) | NOT NULL, UNIQUE                                                 | メールアドレス |
| reason     | VARCHAR(20)  | NOT NULL, CHECK IN ('unsubscribe','bounce','complaint','manual') | 停止理由       |
| created_at | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                          | 作成日時       |

---

## 9. プロジェクト

### 9-1. `projects` — プロジェクト

部活・サブコミュニティとして機能するプロジェクト。

| カラム名            | 型           | 制約                                                                                            | 説明                                                           |
| ------------------- | ------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| id                  | UUID         | PK, DEFAULT gen_random_uuid()                                                                   | ID                                                             |
| name                | VARCHAR(200) | NOT NULL                                                                                        | プロジェクト名                                                 |
| description         | TEXT         | NULL                                                                                            | 概要（リッチテキスト: HTML形式。画像・絵文字・太文字等を含む） |
| cover_image_url     | VARCHAR(500) | NULL                                                                                            | カバー画像URL                                                  |
| category_id         | UUID         | FK → categories.id, NULL                                                                        | カテゴリーID                                                   |
| event_id            | UUID         | FK → events.id, NULL                                                                            | 関係イベントID                                                 |
| start_date          | DATE         | NULL                                                                                            | 開始日                                                         |
| end_date            | DATE         | NULL                                                                                            | 終了日                                                         |
| status              | VARCHAR(20)  | NOT NULL, DEFAULT 'not_started', CHECK IN ('not_started','in_progress','completed','cancelled') | 状況                                                           |
| publish_status      | VARCHAR(20)  | NOT NULL, DEFAULT 'draft', CHECK IN ('draft','published','archived')                            | 公開ステータス                                                 |
| invite_token        | VARCHAR(100) | NOT NULL, UNIQUE                                                                                | 参加用招待トークン（URL/QR生成用）                             |
| invite_link_enabled | BOOLEAN      | NOT NULL, DEFAULT FALSE                                                                         | 招待リンク公開フラグ                                           |
| member_count        | INTEGER      | NOT NULL, DEFAULT 0                                                                             | メンバー数（キャッシュ）                                       |
| created_by_user_id  | UUID         | FK → users.id, NOT NULL                                                                         | 作成者ユーザーID                                               |
| created_at          | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                                         | 作成日時                                                       |
| updated_at          | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                                         | 更新日時                                                       |
| deleted_at          | TIMESTAMPTZ  | NULL                                                                                            | 論理削除日時                                                   |

**インデックス**: idx ON (publish_status, status) WHERE deleted_at IS NULL, idx ON (created_by_user_id), idx ON (event_id), idx ON (category_id)

---

### 9-2. `project_members` — プロジェクトメンバー

| カラム名       | 型          | 制約                                                                  | 説明           |
| -------------- | ----------- | --------------------------------------------------------------------- | -------------- |
| id             | UUID        | PK, DEFAULT gen_random_uuid()                                         | ID             |
| project_id     | UUID        | FK → projects.id, NOT NULL                                            | プロジェクトID |
| user_id        | UUID        | FK → users.id, NOT NULL                                               | ユーザーID     |
| role           | VARCHAR(20) | NOT NULL, DEFAULT 'member', CHECK IN ('admin','member')               | ロール         |
| status         | VARCHAR(20) | NOT NULL, DEFAULT 'active', CHECK IN ('active','withdrawn','removed') | ステータス     |
| joined_at      | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                               | 参加日時       |
| removed_at     | TIMESTAMPTZ | NULL                                                                  | 除外日時       |
| removed_reason | TEXT        | NULL                                                                  | 除外理由       |
| created_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                               | 作成日時       |
| updated_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                               | 更新日時       |

**インデックス**: UNIQUE ON (project_id, user_id) WHERE status = 'active', idx ON (user_id)

---

### 9-3. `project_threads` — プロジェクトスレッド

| カラム名           | 型           | 制約                          | 説明                 |
| ------------------ | ------------ | ----------------------------- | -------------------- |
| id                 | UUID         | PK, DEFAULT gen_random_uuid() | ID                   |
| project_id         | UUID         | FK → projects.id, NOT NULL    | プロジェクトID       |
| title              | VARCHAR(200) | NOT NULL                      | スレッドタイトル     |
| created_by_user_id | UUID         | FK → users.id, NOT NULL       | 作成者ユーザーID     |
| is_pinned          | BOOLEAN      | NOT NULL, DEFAULT FALSE       | ピン留めフラグ       |
| reply_count        | INTEGER      | NOT NULL, DEFAULT 0           | 返信数（キャッシュ） |
| last_reply_at      | TIMESTAMPTZ  | NULL                          | 最終返信日時         |
| created_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 作成日時             |
| updated_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 更新日時             |
| deleted_at         | TIMESTAMPTZ  | NULL                          | 論理削除日時         |

**インデックス**: idx ON (project_id, is_pinned DESC, last_reply_at DESC) WHERE deleted_at IS NULL

---

### 9-4. `project_thread_replies` — スレッド返信

| カラム名       | 型          | 制約                              | 説明                                                               |
| -------------- | ----------- | --------------------------------- | ------------------------------------------------------------------ |
| id             | UUID        | PK, DEFAULT gen_random_uuid()     | ID                                                                 |
| thread_id      | UUID        | FK → project_threads.id, NOT NULL | スレッドID                                                         |
| author_user_id | UUID        | FK → users.id, NOT NULL           | 投稿者ユーザーID                                                   |
| body           | TEXT        | NOT NULL                          | 返信本文（リッチテキスト: HTML形式。画像・絵文字・太文字等を含む） |
| like_count     | INTEGER     | NOT NULL, DEFAULT 0               | いいね数（キャッシュ）                                             |
| created_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()           | 作成日時                                                           |
| updated_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()           | 更新日時                                                           |
| deleted_at     | TIMESTAMPTZ | NULL                              | 論理削除日時                                                       |

**インデックス**: idx ON (thread_id, created_at) WHERE deleted_at IS NULL

---

### 9-4a. `project_thread_reply_attachments` — スレッド返信添付ファイル

| カラム名   | 型          | 制約                                     | 説明       |
| ---------- | ----------- | ---------------------------------------- | ---------- |
| id         | UUID        | PK, DEFAULT gen_random_uuid()            | ID         |
| reply_id   | UUID        | FK → project_thread_replies.id, NOT NULL | 返信ID     |
| file_id    | UUID        | FK → files.id, NOT NULL                  | ファイルID |
| sort_order | INTEGER     | NOT NULL, DEFAULT 0                      | 表示順     |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                  | 作成日時   |

**インデックス**: idx ON (reply_id, sort_order)

---

### 9-4b. `project_thread_likes` — スレッド返信いいね

| カラム名   | 型          | 制約                                     | 説明       |
| ---------- | ----------- | ---------------------------------------- | ---------- |
| id         | UUID        | PK, DEFAULT gen_random_uuid()            | ID         |
| user_id    | UUID        | FK → users.id, NOT NULL                  | ユーザーID |
| reply_id   | UUID        | FK → project_thread_replies.id, NOT NULL | 返信ID     |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                  | 作成日時   |

**インデックス**: UNIQUE ON (user_id, reply_id), idx ON (reply_id)

---

### 9-5. `project_tags` — プロジェクトタグ

| カラム名   | 型          | 制約                    | 説明           |
| ---------- | ----------- | ----------------------- | -------------- |
| project_id | UUID        | PK, FK → projects.id    | プロジェクトID |
| tag_id     | UUID        | PK, FK → tags.id        | タグID         |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時       |

**インデックス**: idx ON (tag_id)

---

### 9-6. `project_files` — プロジェクトファイル

| カラム名            | 型           | 制約                                                 | 説明                             |
| ------------------- | ------------ | ---------------------------------------------------- | -------------------------------- |
| id                  | UUID         | PK, DEFAULT gen_random_uuid()                        | ID                               |
| project_id          | UUID         | FK → projects.id, NOT NULL                           | プロジェクトID                   |
| type                | VARCHAR(10)  | NOT NULL, DEFAULT 'file', CHECK IN ('file','folder') | 種別                             |
| name                | VARCHAR(200) | NULL                                                 | フォルダ名（typeがfolderの場合） |
| parent_folder_id    | UUID         | FK → project_files.id, NULL                          | 親フォルダID（NULL=ルート）      |
| file_id             | UUID         | FK → files.id, NULL                                  | ファイルID（typeがfileの場合）   |
| sort_order          | INTEGER      | NOT NULL, DEFAULT 0                                  | 表示順                           |
| uploaded_by_user_id | UUID         | FK → users.id, NOT NULL                              | 作成者ユーザーID                 |
| created_at          | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                              | 作成日時                         |

**インデックス**: idx ON (project_id, parent_folder_id, sort_order)

---

### 9-7. `project_tasks` — プロジェクトタスク（ガントチャート）

タスク名・担当者・進捗・期間を管理し、ガントチャート形式で表示。

| カラム名           | 型           | 制約                                | 説明                         |
| ------------------ | ------------ | ----------------------------------- | ---------------------------- |
| id                 | UUID         | PK, DEFAULT gen_random_uuid()       | ID                           |
| project_id         | UUID         | FK → projects.id, NOT NULL          | プロジェクトID               |
| title              | VARCHAR(200) | NOT NULL                            | タスク名                     |
| description        | TEXT         | NULL                                | 概要                         |
| assignee_user_id   | UUID         | FK → users.id, NULL                 | 担当者ユーザーID             |
| progress           | INTEGER      | NOT NULL, DEFAULT 0, CHECK (0〜100) | 進捗（%）                    |
| requested_date     | DATE         | NULL                                | 依頼日                       |
| due_date           | DATE         | NULL                                | 締切日                       |
| notify_assignee    | BOOLEAN      | NOT NULL, DEFAULT FALSE             | タスク依頼をメッセージで通知 |
| sort_order         | INTEGER      | NOT NULL, DEFAULT 0                 | 表示順                       |
| created_by_user_id | UUID         | FK → users.id, NOT NULL             | 作成者ユーザーID             |
| created_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()             | 作成日時                     |
| updated_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()             | 更新日時                     |

**インデックス**: idx ON (project_id, sort_order), idx ON (assignee_user_id)

---

### 9-8. `project_task_attachments` — タスク添付ファイル

| カラム名   | 型          | 制約                            | 説明       |
| ---------- | ----------- | ------------------------------- | ---------- |
| id         | UUID        | PK, DEFAULT gen_random_uuid()   | ID         |
| task_id    | UUID        | FK → project_tasks.id, NOT NULL | タスクID   |
| file_id    | UUID        | FK → files.id, NOT NULL         | ファイルID |
| sort_order | INTEGER     | NOT NULL, DEFAULT 0             | 表示順     |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()         | 作成日時   |

**インデックス**: idx ON (task_id, sort_order)

---

### 9-9. `project_board_posts` — プロジェクト掲示板投稿（トピック）

プロジェクト専用掲示板。モジュール5の掲示板と同構造。

| カラム名       | 型           | 制約                                                                 | 説明                                                           |
| -------------- | ------------ | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| id             | UUID         | PK, DEFAULT gen_random_uuid()                                        | ID                                                             |
| project_id     | UUID         | FK → projects.id, NOT NULL                                           | プロジェクトID                                                 |
| category_id    | UUID         | FK → categories.id, NULL                                             | カテゴリID                                                     |
| author_user_id | UUID         | FK → users.id, NOT NULL                                              | 投稿者ユーザーID                                               |
| language       | VARCHAR(20)  | NULL, DEFAULT 'ja'                                                   | 使用言語                                                       |
| title          | VARCHAR(200) | NOT NULL                                                             | タイトル                                                       |
| body           | TEXT         | NOT NULL                                                             | 概要（リッチテキスト: HTML形式。画像・絵文字・太文字等を含む） |
| publish_status | VARCHAR(20)  | NOT NULL, DEFAULT 'draft', CHECK IN ('draft','published','archived') | 公開ステータス                                                 |
| sort_order     | INTEGER      | NOT NULL, DEFAULT 0                                                  | 表示順                                                         |
| is_pinned      | BOOLEAN      | NOT NULL, DEFAULT FALSE                                              | ピン留めフラグ                                                 |
| view_count     | INTEGER      | NOT NULL, DEFAULT 0                                                  | 閲覧数                                                         |
| comment_count  | INTEGER      | NOT NULL, DEFAULT 0                                                  | コメント数（キャッシュ）                                       |
| like_count     | INTEGER      | NOT NULL, DEFAULT 0                                                  | いいね数（キャッシュ）                                         |
| created_at     | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                              | 作成日時                                                       |
| updated_at     | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                              | 更新日時                                                       |
| deleted_at     | TIMESTAMPTZ  | NULL                                                                 | 論理削除日時                                                   |

**インデックス**: idx ON (project_id, publish_status, is_pinned DESC, sort_order, created_at DESC) WHERE deleted_at IS NULL, idx ON (author_user_id)

---

### 9-10. `project_board_post_attachments` — プロジェクト掲示板添付ファイル

| カラム名   | 型          | 制約                                  | 説明       |
| ---------- | ----------- | ------------------------------------- | ---------- |
| id         | UUID        | PK, DEFAULT gen_random_uuid()         | ID         |
| post_id    | UUID        | FK → project_board_posts.id, NOT NULL | 投稿ID     |
| file_id    | UUID        | FK → files.id, NOT NULL               | ファイルID |
| sort_order | INTEGER     | NOT NULL, DEFAULT 0                   | 表示順     |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()               | 作成日時   |

**インデックス**: idx ON (post_id, sort_order)

---

### 9-11. `project_board_comments` — プロジェクト掲示板コメント

ネスト構造対応（parent_comment_id による自己参照）。

| カラム名          | 型          | 制約                                  | 説明                     |
| ----------------- | ----------- | ------------------------------------- | ------------------------ |
| id                | UUID        | PK, DEFAULT gen_random_uuid()         | ID                       |
| post_id           | UUID        | FK → project_board_posts.id, NOT NULL | 投稿ID                   |
| author_user_id    | UUID        | FK → users.id, NOT NULL               | コメント者ユーザーID     |
| parent_comment_id | UUID        | FK → project_board_comments.id, NULL  | 親コメントID（ネスト用） |
| body              | TEXT        | NOT NULL                              | コメント本文             |
| like_count        | INTEGER     | NOT NULL, DEFAULT 0                   | いいね数（キャッシュ）   |
| created_at        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()               | 作成日時                 |
| updated_at        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()               | 更新日時                 |
| deleted_at        | TIMESTAMPTZ | NULL                                  | 論理削除日時             |

**インデックス**: idx ON (post_id, created_at) WHERE deleted_at IS NULL, idx ON (parent_comment_id), idx ON (author_user_id)

---

### 9-12. `project_board_likes` — プロジェクト掲示板いいね

投稿・コメントへの「いいね」。ポリモーフィック参照。

| カラム名    | 型          | 制約                                                              | 説明       |
| ----------- | ----------- | ----------------------------------------------------------------- | ---------- |
| id          | UUID        | PK, DEFAULT gen_random_uuid()                                     | ID         |
| user_id     | UUID        | FK → users.id, NOT NULL                                           | ユーザーID |
| target_type | VARCHAR(20) | NOT NULL, CHECK IN ('project_board_post','project_board_comment') | 対象種別   |
| target_id   | UUID        | NOT NULL                                                          | 対象ID     |
| created_at  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                           | 作成日時   |

**インデックス**: UNIQUE ON (user_id, target_type, target_id), idx ON (target_type, target_id)

---

## 10. EC・ショップ

### 10-0. `shop_settings` — ショップ設定

1コミュニティに1ショップ。ショップ全体の設定を管理する。

| カラム名           | 型           | 制約                                                                 | 説明                 |
| ------------------ | ------------ | -------------------------------------------------------------------- | -------------------- |
| id                 | UUID         | PK, DEFAULT gen_random_uuid()                                        | ID                   |
| icon_image_url     | VARCHAR(500) | NULL                                                                 | アイコン画像URL      |
| header_image_url   | VARCHAR(500) | NULL                                                                 | ヘッダー画像URL      |
| publish_status     | VARCHAR(20)  | NOT NULL, DEFAULT 'draft', CHECK IN ('draft','published','archived') | 公開ステータス       |
| auto_translate     | BOOLEAN      | NOT NULL, DEFAULT FALSE                                              | 自動翻訳フラグ       |
| updated_by_user_id | UUID         | FK → users.id, NULL                                                  | 最終更新者ユーザーID |
| created_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                              | 作成日時             |
| updated_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                              | 更新日時             |

---

### 10-1. `products` — 商品

| カラム名         | 型           | 制約                                                                 | 説明                   |
| ---------------- | ------------ | -------------------------------------------------------------------- | ---------------------- |
| id               | UUID         | PK, DEFAULT gen_random_uuid()                                        | ID                     |
| category_id      | UUID         | FK → categories.id, NULL                                             | カテゴリID             |
| series_id        | UUID         | FK → product_series.id, NULL                                         | シリーズID             |
| seller_user_id   | UUID         | FK → users.id, NOT NULL                                              | 出品者ユーザーID       |
| name             | VARCHAR(200) | NOT NULL                                                             | 商品名                 |
| description      | TEXT         | NULL                                                                 | 商品説明               |
| price            | INTEGER      | NOT NULL                                                             | 価格（円）             |
| compare_at_price | INTEGER      | NULL                                                                 | 元価格（セール表示用） |
| stock            | INTEGER      | NULL                                                                 | 在庫数（NULLは無制限） |
| seller_type      | VARCHAR(10)  | NOT NULL, CHECK IN ('admin','member')                                | 出品者種別             |
| publish_status   | VARCHAR(20)  | NOT NULL, DEFAULT 'draft', CHECK IN ('draft','published','archived') | 公開ステータス         |
| status           | VARCHAR(20)  | NOT NULL, DEFAULT 'on_sale', CHECK IN ('on_sale','sold_out')         | 販売状況               |
| sale_start_at    | TIMESTAMPTZ  | NULL                                                                 | 販売開始日時           |
| sale_end_at      | TIMESTAMPTZ  | NULL                                                                 | 販売終了日時           |
| sales_count      | INTEGER      | NOT NULL, DEFAULT 0                                                  | 販売数（キャッシュ）   |
| created_at       | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                              | 作成日時               |
| updated_at       | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                              | 更新日時               |
| deleted_at       | TIMESTAMPTZ  | NULL                                                                 | 論理削除日時           |

**インデックス**: idx ON (publish_status, status, created_at DESC) WHERE deleted_at IS NULL, idx ON (category_id), idx ON (series_id), idx ON (seller_user_id)

---

### 10-1a. `product_series` — 商品シリーズ

| カラム名   | 型           | 制約                          | 説明       |
| ---------- | ------------ | ----------------------------- | ---------- |
| id         | UUID         | PK, DEFAULT gen_random_uuid() | ID         |
| name       | VARCHAR(100) | NOT NULL                      | シリーズ名 |
| sort_order | INTEGER      | NOT NULL, DEFAULT 0           | 表示順     |
| created_at | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 作成日時   |
| updated_at | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 更新日時   |

**インデックス**: idx ON (sort_order)

---

### 10-2. `product_images` — 商品画像

| カラム名   | 型          | 制約                          | 説明             |
| ---------- | ----------- | ----------------------------- | ---------------- |
| id         | UUID        | PK, DEFAULT gen_random_uuid() | ID               |
| product_id | UUID        | FK → products.id, NOT NULL    | 商品ID           |
| file_id    | UUID        | FK → files.id, NOT NULL       | ファイルID       |
| sort_order | INTEGER     | NOT NULL, DEFAULT 0           | 表示順           |
| is_primary | BOOLEAN     | NOT NULL, DEFAULT FALSE       | メイン画像フラグ |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 作成日時         |

**インデックス**: idx ON (product_id, sort_order)

---

### 10-3. `orders` — 販売履歴

出品者と購入者の直接取引の履歴管理。決済はシステム外で行う。

| カラム名       | 型          | 制約                                                                             | 説明             |
| -------------- | ----------- | -------------------------------------------------------------------------------- | ---------------- |
| id             | UUID        | PK, DEFAULT gen_random_uuid()                                                    | ID               |
| buyer_user_id  | UUID        | FK → users.id, NOT NULL                                                          | 購入者ユーザーID |
| seller_user_id | UUID        | FK → users.id, NOT NULL                                                          | 出品者ユーザーID |
| order_number   | VARCHAR(50) | NOT NULL, UNIQUE                                                                 | 取引番号         |
| total_amount   | INTEGER     | NOT NULL                                                                         | 合計金額（円）   |
| status         | VARCHAR(20) | NOT NULL, DEFAULT 'in_progress', CHECK IN ('in_progress','completed','canceled') | 取引状況         |
| notes          | TEXT        | NULL                                                                             | 備考             |
| completed_at   | TIMESTAMPTZ | NULL                                                                             | 完了日時         |
| canceled_at    | TIMESTAMPTZ | NULL                                                                             | キャンセル日時   |
| created_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                                          | 作成日時         |
| updated_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                                          | 更新日時         |

**インデックス**: idx ON (buyer_user_id, created_at DESC), idx ON (seller_user_id, created_at DESC), idx ON (status)

---

### 10-4. `order_items` — 販売明細

| カラム名     | 型           | 制約                          | 説明                       |
| ------------ | ------------ | ----------------------------- | -------------------------- |
| id           | UUID         | PK, DEFAULT gen_random_uuid() | ID                         |
| order_id     | UUID         | FK → orders.id, NOT NULL      | 取引ID                     |
| product_id   | UUID         | FK → products.id, NOT NULL    | 商品ID                     |
| product_name | VARCHAR(200) | NOT NULL                      | 商品名（スナップショット） |
| quantity     | INTEGER      | NOT NULL                      | 数量                       |
| unit_price   | INTEGER      | NOT NULL                      | 単価（円）                 |
| subtotal     | INTEGER      | NOT NULL                      | 小計（円）                 |
| created_at   | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 作成日時                   |

**インデックス**: idx ON (order_id), idx ON (product_id)

---

## 11. ポイント

### 11-1. `point_balances` — ポイント残高

| カラム名            | 型          | 制約                            | 説明             |
| ------------------- | ----------- | ------------------------------- | ---------------- |
| id                  | UUID        | PK, DEFAULT gen_random_uuid()   | ID               |
| user_id             | UUID        | FK → users.id, NOT NULL, UNIQUE | ユーザーID       |
| total_earned        | INTEGER     | NOT NULL, DEFAULT 0             | 累計獲得ポイント |
| total_used          | INTEGER     | NOT NULL, DEFAULT 0             | 累計使用ポイント |
| total_expired       | INTEGER     | NOT NULL, DEFAULT 0             | 累計失効ポイント |
| current_balance     | INTEGER     | NOT NULL, DEFAULT 0             | 現在残高         |
| last_transaction_at | TIMESTAMPTZ | NULL                            | 最終取引日時     |
| created_at          | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()         | 作成日時         |
| updated_at          | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()         | 更新日時         |

---

### 11-2. `point_transactions` — ポイント取引履歴

| カラム名           | 型           | 制約                                                                                                   | 説明                             |
| ------------------ | ------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------- |
| id                 | UUID         | PK, DEFAULT gen_random_uuid()                                                                          | ID                               |
| user_id            | UUID         | FK → users.id, NOT NULL                                                                                | ユーザーID                       |
| amount             | INTEGER      | NOT NULL                                                                                               | ポイント数（正=獲得, 負=使用）   |
| type               | VARCHAR(20)  | NOT NULL, CHECK IN ('admin_grant','rule_grant','purchase_use','event_reward','expiry','manual_adjust') | 取引種別                         |
| reference_type     | VARCHAR(30)  | NULL                                                                                                   | 参照先種別                       |
| reference_id       | UUID         | NULL                                                                                                   | 参照先ID                         |
| description        | VARCHAR(200) | NULL                                                                                                   | 説明                             |
| remaining_amount   | INTEGER      | NOT NULL, DEFAULT 0                                                                                    | 残存ポイント（失効追跡用）       |
| expires_at         | TIMESTAMPTZ  | NULL                                                                                                   | ポイント有効期限                 |
| granted_by_user_id | UUID         | FK → users.id, NULL                                                                                    | 付与者ユーザーID（管理者付与時） |
| created_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                                                | 作成日時                         |

**インデックス**: idx ON (user_id, created_at DESC), idx ON (expires_at) WHERE remaining_amount > 0 AND expires_at IS NOT NULL

**備考**: 日次バッチでexpires_at <= NOW() かつ remaining_amount > 0 のレコードを失効処理

---

### 11-3. `point_rules` — ポイント付与ルール

| カラム名      | 型           | 制約                                                                                                                                            | 説明                           |
| ------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| id            | UUID         | PK, DEFAULT gen_random_uuid()                                                                                                                   | ID                             |
| name          | VARCHAR(100) | NOT NULL                                                                                                                                        | ルール名                       |
| trigger_event | VARCHAR(30)  | NOT NULL, CHECK IN ('event_attendance','product_purchase','daily_login','board_post','survey_complete','video_complete','orientation_complete') | トリガーイベント               |
| point_amount  | INTEGER      | NOT NULL                                                                                                                                        | 付与ポイント数                 |
| expiry_days   | INTEGER      | NULL                                                                                                                                            | 有効期限（日数、NULLは無期限） |
| is_active     | BOOLEAN      | NOT NULL, DEFAULT TRUE                                                                                                                          | 有効フラグ                     |
| conditions    | JSONB        | NULL                                                                                                                                            | 追加条件                       |
| created_at    | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                                                                                         | 作成日時                       |
| updated_at    | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                                                                                         | 更新日時                       |

**インデックス**: idx ON (trigger_event) WHERE is_active = TRUE

---

## 12. スキルシェア

### 12-1. `skill_listings` — スキル出品

タイムチケット形式でのスキルシェア出品。

| カラム名         | 型           | 制約                                                               | 説明                 |
| ---------------- | ------------ | ------------------------------------------------------------------ | -------------------- |
| id               | UUID         | PK, DEFAULT gen_random_uuid()                                      | ID                   |
| category_id      | UUID         | FK → categories.id, NULL                                           | カテゴリID           |
| provider_user_id | UUID         | FK → users.id, NOT NULL                                            | 提供者ユーザーID     |
| title            | VARCHAR(200) | NOT NULL                                                           | タイトル             |
| description      | TEXT         | NULL                                                               | 説明                 |
| price            | INTEGER      | NOT NULL                                                           | 価格（円）           |
| duration_minutes | INTEGER      | NOT NULL                                                           | 提供時間（分）       |
| format           | VARCHAR(20)  | NOT NULL, DEFAULT 'online', CHECK IN ('online','offline','both')   | 提供形式             |
| status           | VARCHAR(20)  | NOT NULL, DEFAULT 'active', CHECK IN ('draft','active','inactive') | ステータス           |
| booking_count    | INTEGER      | NOT NULL, DEFAULT 0                                                | 予約数（キャッシュ） |
| created_at       | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                            | 作成日時             |
| updated_at       | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                            | 更新日時             |
| deleted_at       | TIMESTAMPTZ  | NULL                                                               | 論理削除日時         |

**インデックス**: idx ON (status, created_at DESC) WHERE deleted_at IS NULL, idx ON (category_id), idx ON (provider_user_id)

---

### 12-2. `skill_bookings` — スキル予約

| カラム名          | 型          | 制約                                                                                               | 説明             |
| ----------------- | ----------- | -------------------------------------------------------------------------------------------------- | ---------------- |
| id                | UUID        | PK, DEFAULT gen_random_uuid()                                                                      | ID               |
| skill_listing_id  | UUID        | FK → skill_listings.id, NOT NULL                                                                   | スキル出品ID     |
| requester_user_id | UUID        | FK → users.id, NOT NULL                                                                            | 依頼者ユーザーID |
| provider_user_id  | UUID        | FK → users.id, NOT NULL                                                                            | 提供者ユーザーID |
| status            | VARCHAR(20) | NOT NULL, DEFAULT 'requested', CHECK IN ('requested','approved','rejected','completed','canceled') | ステータス       |
| scheduled_at      | TIMESTAMPTZ | NULL                                                                                               | 予定日時         |
| message           | TEXT        | NULL                                                                                               | 初回メッセージ   |
| payment_id        | UUID        | FK → payments.id, NULL                                                                             | 決済ID           |
| completed_at      | TIMESTAMPTZ | NULL                                                                                               | 完了日時         |
| canceled_at       | TIMESTAMPTZ | NULL                                                                                               | キャンセル日時   |
| created_at        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                                                            | 作成日時         |
| updated_at        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                                                            | 更新日時         |

**インデックス**: idx ON (skill_listing_id, status), idx ON (requester_user_id), idx ON (provider_user_id)

---

### 12-3. `skill_messages` — スキル取引メッセージ

提供者と依頼者間のやり取り。

| カラム名       | 型          | 制約                             | 説明             |
| -------------- | ----------- | -------------------------------- | ---------------- |
| id             | UUID        | PK, DEFAULT gen_random_uuid()    | ID               |
| booking_id     | UUID        | FK → skill_bookings.id, NOT NULL | 予約ID           |
| sender_user_id | UUID        | FK → users.id, NOT NULL          | 送信者ユーザーID |
| body           | TEXT        | NOT NULL                         | メッセージ本文   |
| created_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()          | 作成日時         |

**インデックス**: idx ON (booking_id, created_at)

---

## 13. アンケート

### 13-1. `surveys` — アンケート

| カラム名           | 型           | 制約                                                            | 説明                 |
| ------------------ | ------------ | --------------------------------------------------------------- | -------------------- |
| id                 | UUID         | PK, DEFAULT gen_random_uuid()                                   | ID                   |
| title              | VARCHAR(200) | NOT NULL                                                        | タイトル             |
| description        | TEXT         | NULL                                                            | 説明                 |
| is_anonymous       | BOOLEAN      | NOT NULL, DEFAULT FALSE                                         | 匿名回答フラグ       |
| status             | VARCHAR(20)  | NOT NULL, DEFAULT 'draft', CHECK IN ('draft','active','closed') | ステータス           |
| target_type        | VARCHAR(20)  | NOT NULL, DEFAULT 'all', CHECK IN ('all','rank','custom')       | 対象種別             |
| target_filter      | JSONB        | NULL                                                            | 対象フィルタ条件     |
| starts_at          | TIMESTAMPTZ  | NULL                                                            | 回答開始日時         |
| ends_at            | TIMESTAMPTZ  | NULL                                                            | 回答終了日時         |
| response_count     | INTEGER      | NOT NULL, DEFAULT 0                                             | 回答数（キャッシュ） |
| created_by_user_id | UUID         | FK → users.id, NOT NULL                                         | 作成者ユーザーID     |
| created_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                         | 作成日時             |
| updated_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                         | 更新日時             |
| deleted_at         | TIMESTAMPTZ  | NULL                                                            | 論理削除日時         |

**インデックス**: idx ON (status) WHERE deleted_at IS NULL

---

### 13-2. `survey_questions` — アンケート質問

| カラム名      | 型          | 制約                                                                         | 説明                           |
| ------------- | ----------- | ---------------------------------------------------------------------------- | ------------------------------ |
| id            | UUID        | PK, DEFAULT gen_random_uuid()                                                | ID                             |
| survey_id     | UUID        | FK → surveys.id, NOT NULL                                                    | アンケートID                   |
| question_type | VARCHAR(20) | NOT NULL, CHECK IN ('single_choice','multi_choice','text','rating','number') | 質問種別                       |
| question_text | TEXT        | NOT NULL                                                                     | 質問文                         |
| is_required   | BOOLEAN     | NOT NULL, DEFAULT FALSE                                                      | 必須フラグ                     |
| sort_order    | INTEGER     | NOT NULL, DEFAULT 0                                                          | 表示順                         |
| options       | JSONB       | NULL                                                                         | 選択肢配列（[{value, label}]） |
| min_value     | INTEGER     | NULL                                                                         | 最小値（rating/number用）      |
| max_value     | INTEGER     | NULL                                                                         | 最大値（rating/number用）      |
| created_at    | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                                      | 作成日時                       |
| updated_at    | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                                      | 更新日時                       |

**インデックス**: idx ON (survey_id, sort_order)

---

### 13-3. `survey_responses` — アンケート回答セッション

| カラム名           | 型          | 制約                          | 説明                           |
| ------------------ | ----------- | ----------------------------- | ------------------------------ |
| id                 | UUID        | PK, DEFAULT gen_random_uuid() | ID                             |
| survey_id          | UUID        | FK → surveys.id, NOT NULL     | アンケートID                   |
| respondent_user_id | UUID        | FK → users.id, NULL           | 回答者ユーザーID（匿名時NULL） |
| submitted_at       | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 回答日時                       |
| created_at         | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 作成日時                       |

**インデックス**: idx ON (survey_id), UNIQUE ON (survey_id, respondent_user_id) WHERE respondent_user_id IS NOT NULL

---

### 13-4. `survey_answers` — 個別回答

| カラム名         | 型            | 制約                               | 説明             |
| ---------------- | ------------- | ---------------------------------- | ---------------- |
| id               | UUID          | PK, DEFAULT gen_random_uuid()      | ID               |
| response_id      | UUID          | FK → survey_responses.id, NOT NULL | 回答セッションID |
| question_id      | UUID          | FK → survey_questions.id, NOT NULL | 質問ID           |
| selected_options | JSONB         | NULL                               | 選択された選択肢 |
| text_value       | TEXT          | NULL                               | テキスト回答     |
| numeric_value    | DECIMAL(10,2) | NULL                               | 数値/評価回答    |
| created_at       | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW()            | 作成日時         |

**インデックス**: idx ON (response_id), idx ON (question_id)

---

## 14. 広告

### 14-1. `advertisements` — 広告

| カラム名         | 型           | 制約                                                              | 説明                     |
| ---------------- | ------------ | ----------------------------------------------------------------- | ------------------------ |
| id               | UUID         | PK, DEFAULT gen_random_uuid()                                     | ID                       |
| title            | VARCHAR(100) | NOT NULL                                                          | 広告タイトル             |
| image_url        | VARCHAR(500) | NOT NULL                                                          | バナー画像URL            |
| link_url         | VARCHAR(500) | NOT NULL                                                          | リンクURL                |
| position         | VARCHAR(20)  | NOT NULL, CHECK IN ('header_banner','sidebar','footer','in_feed') | 掲載位置                 |
| starts_at        | TIMESTAMPTZ  | NOT NULL                                                          | 掲載開始日時             |
| ends_at          | TIMESTAMPTZ  | NULL                                                              | 掲載終了日時             |
| is_active        | BOOLEAN      | NOT NULL, DEFAULT TRUE                                            | 有効フラグ               |
| impression_count | INTEGER      | NOT NULL, DEFAULT 0                                               | 表示回数（キャッシュ）   |
| click_count      | INTEGER      | NOT NULL, DEFAULT 0                                               | クリック数（キャッシュ） |
| sort_order       | INTEGER      | NOT NULL, DEFAULT 0                                               | 表示順                   |
| created_at       | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                           | 作成日時                 |
| updated_at       | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                           | 更新日時                 |
| deleted_at       | TIMESTAMPTZ  | NULL                                                              | 論理削除日時             |

**インデックス**: idx ON (position, is_active, starts_at) WHERE deleted_at IS NULL

---

### 14-2. `advertisement_events` — 広告表示/クリック記録

| カラム名         | 型          | 制約                                      | 説明         |
| ---------------- | ----------- | ----------------------------------------- | ------------ |
| id               | UUID        | PK, DEFAULT gen_random_uuid()             | ID           |
| advertisement_id | UUID        | FK → advertisements.id, NOT NULL          | 広告ID       |
| event_type       | VARCHAR(10) | NOT NULL, CHECK IN ('impression','click') | イベント種別 |
| user_id          | UUID        | FK → users.id, NULL                       | ユーザーID   |
| ip_address       | INET        | NULL                                      | IPアドレス   |
| user_agent       | TEXT        | NULL                                      | User-Agent   |
| created_at       | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                   | 作成日時     |

**インデックス**: idx ON (advertisement_id, event_type, created_at)

**備考**: 月次パーティション推奨（created_at 基準）

---

## 15. 外部連携

### 15-1. `line_user_connections` — LINE連携

| カラム名     | 型          | 制約                            | 説明            |
| ------------ | ----------- | ------------------------------- | --------------- |
| id           | UUID        | PK, DEFAULT gen_random_uuid()   | ID              |
| user_id      | UUID        | FK → users.id, NOT NULL, UNIQUE | ユーザーID      |
| line_user_id | VARCHAR(50) | NOT NULL                        | LINE ユーザーID |
| is_enabled   | BOOLEAN     | NOT NULL, DEFAULT TRUE          | 連携有効フラグ  |
| connected_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()         | 連携日時        |
| created_at   | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()         | 作成日時        |
| updated_at   | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()         | 更新日時        |

**インデックス**: idx ON (line_user_id)

---

### 15-2. `webhook_endpoints` — Webhook設定

| カラム名    | 型           | 制約                          | 説明                           |
| ----------- | ------------ | ----------------------------- | ------------------------------ |
| id          | UUID         | PK, DEFAULT gen_random_uuid() | ID                             |
| url         | VARCHAR(500) | NOT NULL                      | Webhook URL                    |
| secret_hash | VARCHAR(255) | NOT NULL                      | 署名検証用シークレットハッシュ |
| events      | JSONB        | NOT NULL                      | 購読イベント種別               |
| is_active   | BOOLEAN      | NOT NULL, DEFAULT TRUE        | 有効フラグ                     |
| created_at  | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 作成日時                       |
| updated_at  | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 更新日時                       |

---

### 15-3. `webhook_deliveries` — Webhook配信記録

| カラム名             | 型          | 制約                                                                   | 説明                       |
| -------------------- | ----------- | ---------------------------------------------------------------------- | -------------------------- |
| id                   | UUID        | PK, DEFAULT gen_random_uuid()                                          | ID                         |
| webhook_endpoint_id  | UUID        | FK → webhook_endpoints.id, NOT NULL                                    | Webhookエンドポイント ID   |
| event_type           | VARCHAR(50) | NOT NULL                                                               | イベント種別               |
| payload              | JSONB       | NOT NULL                                                               | ペイロード                 |
| response_status_code | INTEGER     | NULL                                                                   | レスポンスステータスコード |
| response_body        | TEXT        | NULL                                                                   | レスポンスボディ           |
| attempts             | INTEGER     | NOT NULL, DEFAULT 0                                                    | 試行回数                   |
| status               | VARCHAR(20) | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','delivered','failed') | 配信ステータス             |
| delivered_at         | TIMESTAMPTZ | NULL                                                                   | 配信日時                   |
| next_retry_at        | TIMESTAMPTZ | NULL                                                                   | 次回リトライ日時           |
| created_at           | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                                | 作成日時                   |

**インデックス**: idx ON (webhook_endpoint_id, created_at DESC), idx ON (status, next_retry_at) WHERE status IN ('pending','failed')

---

## 16. オリエンテーション

### 16-1. `orientation_pages` — オリエンテーションページ

新規会員向けの案内ページ。

| カラム名     | 型           | 制約                          | 説明                  |
| ------------ | ------------ | ----------------------------- | --------------------- |
| id           | UUID         | PK, DEFAULT gen_random_uuid() | ID                    |
| title        | VARCHAR(200) | NOT NULL                      | ページタイトル        |
| body         | TEXT         | NOT NULL                      | 本文（HTML/Markdown） |
| sort_order   | INTEGER      | NOT NULL, DEFAULT 0           | 表示順                |
| is_published | BOOLEAN      | NOT NULL, DEFAULT TRUE        | 公開フラグ            |
| created_at   | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 作成日時              |
| updated_at   | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 更新日時              |

**インデックス**: idx ON (sort_order) WHERE is_published = TRUE

---

### 16-2. `orientation_completions` — オリエン完了記録

| カラム名     | 型          | 制約                            | 説明       |
| ------------ | ----------- | ------------------------------- | ---------- |
| id           | UUID        | PK, DEFAULT gen_random_uuid()   | ID         |
| user_id      | UUID        | FK → users.id, NOT NULL, UNIQUE | ユーザーID |
| completed_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()         | 完了日時   |
| created_at   | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()         | 作成日時   |

---

## 17. アナリティクス

### 17-1. `activity_logs` — アクティビティログ

ユーザー行動の記録。アナリティクス・エンゲージメント分析のデータソース。

| カラム名      | 型          | 制約                          | 説明                                                                                            |
| ------------- | ----------- | ----------------------------- | ----------------------------------------------------------------------------------------------- |
| id            | UUID        | PK, DEFAULT gen_random_uuid() | ID                                                                                              |
| user_id       | UUID        | FK → users.id, NOT NULL       | ユーザーID                                                                                      |
| action        | VARCHAR(50) | NOT NULL                      | アクション（login, board_post_create, event_join, video_watch, chat_send, product_purchase 等） |
| resource_type | VARCHAR(30) | NULL                          | リソース種別                                                                                    |
| resource_id   | UUID        | NULL                          | リソースID                                                                                      |
| metadata      | JSONB       | NULL                          | メタデータ                                                                                      |
| created_at    | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 作成日時                                                                                        |

**インデックス**: idx ON (user_id, created_at DESC), idx ON (action, created_at DESC)

**備考**: 月次パーティション推奨（created_at 基準）

---

### 17-2. `engagement_scores` — エンゲージメントスコア

| カラム名                  | 型           | 制約                            | 説明               |
| ------------------------- | ------------ | ------------------------------- | ------------------ |
| id                        | UUID         | PK, DEFAULT gen_random_uuid()   | ID                 |
| user_id                   | UUID         | FK → users.id, NOT NULL, UNIQUE | ユーザーID         |
| score                     | DECIMAL(5,2) | NOT NULL, DEFAULT 0             | 総合スコア         |
| login_frequency_score     | DECIMAL(5,2) | NOT NULL, DEFAULT 0             | ログイン頻度スコア |
| post_frequency_score      | DECIMAL(5,2) | NOT NULL, DEFAULT 0             | 投稿頻度スコア     |
| event_participation_score | DECIMAL(5,2) | NOT NULL, DEFAULT 0             | イベント参加スコア |
| video_watch_score         | DECIMAL(5,2) | NOT NULL, DEFAULT 0             | 動画視聴スコア     |
| calculated_at             | TIMESTAMPTZ  | NOT NULL                        | 算出日時           |
| created_at                | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()         | 作成日時           |
| updated_at                | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()         | 更新日時           |

**インデックス**: idx ON (score DESC)

---

### 17-3. `analytics_snapshots` — 分析スナップショット（日次集計）

| カラム名                 | 型          | 制約                          | 説明                                     |
| ------------------------ | ----------- | ----------------------------- | ---------------------------------------- |
| id                       | UUID        | PK, DEFAULT gen_random_uuid() | ID                                       |
| snapshot_date            | DATE        | NOT NULL, UNIQUE              | 集計日                                   |
| total_members            | INTEGER     | NOT NULL, DEFAULT 0           | 総メンバー数                             |
| active_members           | INTEGER     | NOT NULL, DEFAULT 0           | アクティブメンバー数（30日以内ログイン） |
| new_members              | INTEGER     | NOT NULL, DEFAULT 0           | 新規メンバー数                           |
| withdrawn_members        | INTEGER     | NOT NULL, DEFAULT 0           | 退会メンバー数                           |
| total_posts              | INTEGER     | NOT NULL, DEFAULT 0           | 投稿数                                   |
| total_comments           | INTEGER     | NOT NULL, DEFAULT 0           | コメント数                               |
| total_events             | INTEGER     | NOT NULL, DEFAULT 0           | イベント数                               |
| total_event_participants | INTEGER     | NOT NULL, DEFAULT 0           | イベント参加者数                         |
| total_video_views        | INTEGER     | NOT NULL, DEFAULT 0           | 動画視聴数                               |
| total_orders             | INTEGER     | NOT NULL, DEFAULT 0           | 注文数                                   |
| total_revenue            | INTEGER     | NOT NULL, DEFAULT 0           | 売上（円）                               |
| created_at               | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 作成日時                                 |

---

### 17-4. `member_activity_summaries` — メンバー活動サマリー

メンバーごとの活動状況を集計したキャッシュテーブル。日次バッチで更新。

| カラム名                   | 型          | 制約                            | 説明                 |
| -------------------------- | ----------- | ------------------------------- | -------------------- |
| id                         | UUID        | PK, DEFAULT gen_random_uuid()   | ID                   |
| user_id                    | UUID        | FK → users.id, NOT NULL, UNIQUE | ユーザーID           |
| last_login_at              | TIMESTAMPTZ | NULL                            | 最終ログイン日時     |
| login_count                | INTEGER     | NOT NULL, DEFAULT 0             | ログイン回数         |
| post_count                 | INTEGER     | NOT NULL, DEFAULT 0             | 投稿数               |
| comment_count              | INTEGER     | NOT NULL, DEFAULT 0             | コメント数           |
| event_participation_count  | INTEGER     | NOT NULL, DEFAULT 0             | イベント参加回数     |
| last_event_participated_at | TIMESTAMPTZ | NULL                            | 最終イベント参加日時 |
| video_watch_count          | INTEGER     | NOT NULL, DEFAULT 0             | 動画視聴数           |
| chat_message_count         | INTEGER     | NOT NULL, DEFAULT 0             | チャットメッセージ数 |
| project_count              | INTEGER     | NOT NULL, DEFAULT 0             | 参加プロジェクト数   |
| calculated_at              | TIMESTAMPTZ | NOT NULL                        | 最終算出日時         |
| created_at                 | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()         | 作成日時             |
| updated_at                 | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()         | 更新日時             |

**インデックス**: idx ON (event_participation_count DESC), idx ON (last_login_at DESC)

---

## 18. モデレーション

### 18-1. `content_reports` — コンテンツ通報

| カラム名            | 型          | 制約                                                                                              | 説明             |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------- | ---------------- |
| id                  | UUID        | PK, DEFAULT gen_random_uuid()                                                                     | ID               |
| reporter_user_id    | UUID        | FK → users.id, NOT NULL                                                                           | 通報者ユーザーID |
| target_type         | VARCHAR(30) | NOT NULL, CHECK IN ('board_post','board_comment','chat_message','product','skill_listing','user') | 対象種別         |
| target_id           | UUID        | NOT NULL                                                                                          | 対象ID           |
| category            | VARCHAR(30) | NOT NULL, CHECK IN ('spam','inappropriate','harassment','copyright','misinformation','other')     | 通報カテゴリ     |
| description         | TEXT        | NULL                                                                                              | 通報詳細         |
| status              | VARCHAR(20) | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','reviewing','resolved','dismissed')              | ステータス       |
| assigned_to_user_id | UUID        | FK → users.id, NULL                                                                               | 担当者ユーザーID |
| resolved_at         | TIMESTAMPTZ | NULL                                                                                              | 解決日時         |
| created_at          | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                                                           | 作成日時         |
| updated_at          | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                                                           | 更新日時         |

**インデックス**: idx ON (status, created_at DESC), idx ON (target_type, target_id)

---

### 18-2. `moderation_actions` — モデレーション対応記録

| カラム名          | 型          | 制約                                                                                                        | 説明                   |
| ----------------- | ----------- | ----------------------------------------------------------------------------------------------------------- | ---------------------- |
| id                | UUID        | PK, DEFAULT gen_random_uuid()                                                                               | ID                     |
| report_id         | UUID        | FK → content_reports.id, NULL                                                                               | 通報ID                 |
| moderator_user_id | UUID        | FK → users.id, NOT NULL                                                                                     | モデレーターユーザーID |
| action_type       | VARCHAR(30) | NOT NULL, CHECK IN ('content_hide','content_delete','user_warn','user_suspend','user_ban','report_dismiss') | アクション種別         |
| target_type       | VARCHAR(30) | NOT NULL                                                                                                    | 対象種別               |
| target_id         | UUID        | NOT NULL                                                                                                    | 対象ID                 |
| reason            | TEXT        | NULL                                                                                                        | 理由                   |
| notes             | TEXT        | NULL                                                                                                        | 内部メモ               |
| created_at        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                                                                     | 作成日時               |

**インデックス**: idx ON (report_id), idx ON (target_type, target_id, created_at DESC)

---

### 18-3. `banned_words` — 禁止ワード

| カラム名    | 型           | 制約                                                            | 説明       |
| ----------- | ------------ | --------------------------------------------------------------- | ---------- |
| id          | UUID         | PK, DEFAULT gen_random_uuid()                                   | ID         |
| word        | VARCHAR(100) | NOT NULL                                                        | 禁止ワード |
| match_type  | VARCHAR(10)  | NOT NULL, DEFAULT 'exact', CHECK IN ('exact','partial','regex') | マッチ種別 |
| action      | VARCHAR(10)  | NOT NULL, DEFAULT 'flag', CHECK IN ('flag','block','replace')   | アクション |
| replacement | VARCHAR(100) | NULL                                                            | 置換文字列 |
| is_active   | BOOLEAN      | NOT NULL, DEFAULT TRUE                                          | 有効フラグ |
| created_at  | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                         | 作成日時   |
| updated_at  | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                         | 更新日時   |

---

## 19. システム管理

### 19-1. `audit_logs` — 監査ログ

| カラム名      | 型           | 制約                                                       | 説明             |
| ------------- | ------------ | ---------------------------------------------------------- | ---------------- |
| id            | UUID         | PK, DEFAULT gen_random_uuid()                              | ID               |
| actor_user_id | UUID         | FK → users.id, NULL                                        | 操作者ユーザーID |
| actor_type    | VARCHAR(20)  | NOT NULL, CHECK IN ('admin','moderator','member','system') | 操作者種別       |
| action        | VARCHAR(100) | NOT NULL                                                   | アクション       |
| resource_type | VARCHAR(50)  | NOT NULL                                                   | リソース種別     |
| resource_id   | VARCHAR(100) | NULL                                                       | リソースID       |
| changes       | JSONB        | NULL                                                       | 変更前後データ   |
| ip_address    | INET         | NULL                                                       | IPアドレス       |
| user_agent    | TEXT         | NULL                                                       | User-Agent       |
| created_at    | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                    | 作成日時         |

**インデックス**: idx ON (actor_user_id, created_at DESC), idx ON (action, created_at DESC)

**備考**: 月次パーティション推奨

---

### 19-2. `announcements` — お知らせ

コミュニティ内のお知らせ。

| カラム名           | 型           | 制約                                                       | 説明             |
| ------------------ | ------------ | ---------------------------------------------------------- | ---------------- |
| id                 | UUID         | PK, DEFAULT gen_random_uuid()                              | ID               |
| title              | VARCHAR(200) | NOT NULL                                                   | タイトル         |
| body               | TEXT         | NOT NULL                                                   | 本文             |
| target_audience    | VARCHAR(20)  | NOT NULL, DEFAULT 'all', CHECK IN ('all','admin','member') | 対象者           |
| is_published       | BOOLEAN      | NOT NULL, DEFAULT FALSE                                    | 公開フラグ       |
| published_at       | TIMESTAMPTZ  | NULL                                                       | 公開日時         |
| pinned_until       | TIMESTAMPTZ  | NULL                                                       | ピン留め期限     |
| created_by_user_id | UUID         | FK → users.id, NOT NULL                                    | 作成者ユーザーID |
| created_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                    | 作成日時         |
| updated_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                    | 更新日時         |

**インデックス**: idx ON (is_published, published_at DESC)

---

### 19-3. `faq_articles` — FAQ記事

| カラム名     | 型           | 制約                          | 説明       |
| ------------ | ------------ | ----------------------------- | ---------- |
| id           | UUID         | PK, DEFAULT gen_random_uuid() | ID         |
| category     | VARCHAR(50)  | NOT NULL                      | カテゴリ   |
| title        | VARCHAR(200) | NOT NULL                      | タイトル   |
| body         | TEXT         | NOT NULL                      | 本文       |
| sort_order   | INTEGER      | NOT NULL, DEFAULT 0           | 表示順     |
| is_published | BOOLEAN      | NOT NULL, DEFAULT TRUE        | 公開フラグ |
| view_count   | INTEGER      | NOT NULL, DEFAULT 0           | 閲覧数     |
| created_at   | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 作成日時   |
| updated_at   | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 更新日時   |

**インデックス**: idx ON (category, sort_order) WHERE is_published = TRUE

---

## 20. アルバム

### 20-1. `albums` — アルバム

写真アルバムの管理。カテゴリ分け・キーワード検索・表示切替対応。

| カラム名           | 型           | 制約                                                                 | 説明                 |
| ------------------ | ------------ | -------------------------------------------------------------------- | -------------------- |
| id                 | UUID         | PK, DEFAULT gen_random_uuid()                                        | ID                   |
| category_id        | UUID         | FK → categories.id, NULL                                             | カテゴリID           |
| title              | VARCHAR(200) | NOT NULL                                                             | アルバムタイトル     |
| description        | TEXT         | NULL                                                                 | 説明                 |
| cover_photo_url    | VARCHAR(500) | NULL                                                                 | カバー写真URL        |
| publish_status     | VARCHAR(20)  | NOT NULL, DEFAULT 'draft', CHECK IN ('draft','published','archived') | 公開ステータス       |
| photo_count        | INTEGER      | NOT NULL, DEFAULT 0                                                  | 写真数（キャッシュ） |
| sort_order         | INTEGER      | NOT NULL, DEFAULT 0                                                  | 表示順               |
| created_by_user_id | UUID         | FK → users.id, NOT NULL                                              | 作成者ユーザーID     |
| created_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                              | 作成日時             |
| updated_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                              | 更新日時             |
| deleted_at         | TIMESTAMPTZ  | NULL                                                                 | 論理削除日時         |

**インデックス**: idx ON (publish_status, sort_order) WHERE deleted_at IS NULL, idx ON (category_id)

---

### 20-2. `album_photos` — アルバム写真

| カラム名            | 型           | 制約                                                                 | 説明                     |
| ------------------- | ------------ | -------------------------------------------------------------------- | ------------------------ |
| id                  | UUID         | PK, DEFAULT gen_random_uuid()                                        | ID                       |
| album_id            | UUID         | FK → albums.id, NOT NULL                                             | アルバムID               |
| category_id         | UUID         | FK → categories.id, NULL                                             | カテゴリID               |
| file_id             | UUID         | FK → files.id, NOT NULL                                              | ファイルID               |
| title               | VARCHAR(200) | NULL                                                                 | 写真タイトル             |
| caption             | VARCHAR(500) | NULL                                                                 | キャプション（検索対象） |
| publish_status      | VARCHAR(20)  | NOT NULL, DEFAULT 'draft', CHECK IN ('draft','published','archived') | 公開ステータス           |
| sort_order          | INTEGER      | NOT NULL, DEFAULT 0                                                  | 表示順                   |
| uploaded_by_user_id | UUID         | FK → users.id, NOT NULL                                              | アップロード者ユーザーID |
| created_at          | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                              | 作成日時                 |

**インデックス**: idx ON (album_id, publish_status, sort_order), idx ON (category_id)

---

### 20-3. `album_tags` — アルバムタグ

| カラム名   | 型          | 制約                    | 説明       |
| ---------- | ----------- | ----------------------- | ---------- |
| album_id   | UUID        | PK, FK → albums.id      | アルバムID |
| tag_id     | UUID        | PK, FK → tags.id        | タグID     |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時   |

**インデックス**: idx ON (tag_id)

---

## 21. 施設・会場

### 21-1. `venues` — 施設・会場

施設・会場の情報管理。イベントの開催場所として利用可能。

| カラム名           | 型           | 制約                                                                                        | 説明                             |
| ------------------ | ------------ | ------------------------------------------------------------------------------------------- | -------------------------------- |
| id                 | UUID         | PK, DEFAULT gen_random_uuid()                                                               | ID                               |
| name               | VARCHAR(200) | NOT NULL                                                                                    | 施設・会場名                     |
| address            | TEXT         | NULL                                                                                        | 住所                             |
| description        | TEXT         | NULL                                                                                        | 説明（リッチテキスト: HTML形式） |
| access_info        | TEXT         | NULL                                                                                        | アクセス                         |
| venue_type         | VARCHAR(30)  | NOT NULL, CHECK IN ('theater','concert_hall','conference_room','stadium','outdoor','other') | タイプ                           |
| capacity           | INTEGER      | NULL                                                                                        | 収容人数                         |
| publish_status     | VARCHAR(20)  | NOT NULL, DEFAULT 'draft', CHECK IN ('draft','published','archived')                        | 公開ステータス                   |
| created_by_user_id | UUID         | FK → users.id, NOT NULL                                                                     | 作成者ユーザーID                 |
| created_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                                     | 作成日時                         |
| updated_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                                     | 更新日時                         |
| deleted_at         | TIMESTAMPTZ  | NULL                                                                                        | 論理削除日時                     |

**インデックス**: idx ON (publish_status, venue_type) WHERE deleted_at IS NULL

---

### 21-2. `venue_images` — 施設・会場画像

| カラム名   | 型          | 制約                          | 説明             |
| ---------- | ----------- | ----------------------------- | ---------------- |
| id         | UUID        | PK, DEFAULT gen_random_uuid() | ID               |
| venue_id   | UUID        | FK → venues.id, NOT NULL      | 施設・会場ID     |
| file_id    | UUID        | FK → files.id, NOT NULL       | ファイルID       |
| sort_order | INTEGER     | NOT NULL, DEFAULT 0           | 表示順           |
| is_primary | BOOLEAN     | NOT NULL, DEFAULT FALSE       | メイン画像フラグ |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 作成日時         |

**インデックス**: idx ON (venue_id, sort_order)

---

## 22. コンテンツ

### 22-1. `contents` — コンテンツ

コンテンツの情報管理。URL/QRコードでの共有対応。

| カラム名           | 型           | 制約                                                                 | 説明                             |
| ------------------ | ------------ | -------------------------------------------------------------------- | -------------------------------- |
| id                 | UUID         | PK, DEFAULT gen_random_uuid()                                        | ID                               |
| name               | VARCHAR(200) | NOT NULL                                                             | コンテンツ名                     |
| content_type       | VARCHAR(50)  | NOT NULL                                                             | 種類                             |
| description        | TEXT         | NULL                                                                 | 説明（リッチテキスト: HTML形式） |
| price              | INTEGER      | NULL                                                                 | 料金（円）                       |
| cover_image_url    | VARCHAR(500) | NULL                                                                 | カバー画像URL                    |
| invite_token       | VARCHAR(100) | NOT NULL, UNIQUE                                                     | 共有用トークン（URL/QR生成用）   |
| publish_status     | VARCHAR(20)  | NOT NULL, DEFAULT 'draft', CHECK IN ('draft','published','archived') | 公開ステータス                   |
| created_by_user_id | UUID         | FK → users.id, NOT NULL                                              | 作成者ユーザーID                 |
| created_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                              | 作成日時                         |
| updated_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                              | 更新日時                         |
| deleted_at         | TIMESTAMPTZ  | NULL                                                                 | 論理削除日時                     |

**インデックス**: idx ON (publish_status, content_type) WHERE deleted_at IS NULL

---

## 23. 共通

### 23-1. `categories` — カテゴリ

掲示板・動画・商品・スキル等で共通利用するカテゴリ。階層構造対応。

| カラム名            | 型           | 制約                          | 説明                                                                   |
| ------------------- | ------------ | ----------------------------- | ---------------------------------------------------------------------- |
| id                  | UUID         | PK, DEFAULT gen_random_uuid() | ID                                                                     |
| parent_id           | UUID         | FK → categories.id, NULL      | 親カテゴリID                                                           |
| scope               | VARCHAR(30)  | NOT NULL                      | スコープ（board_post, video, product, event, skill, faq）              |
| name                | VARCHAR(100) | NOT NULL                      | カテゴリ名                                                             |
| slug                | VARCHAR(100) | NOT NULL                      | スラッグ                                                               |
| description         | TEXT         | NULL                          | 説明                                                                   |
| icon_url            | VARCHAR(500) | NULL                          | アイコンURL                                                            |
| sort_order          | INTEGER      | NOT NULL, DEFAULT 0           | 表示順                                                                 |
| allow_post_creation | BOOLEAN      | NOT NULL, DEFAULT TRUE        | トピック作成可否フラグ（FALSE の場合、このカテゴリへの新規投稿を禁止） |
| required_rank_id    | UUID         | FK → member_ranks.id, NULL    | 閲覧必要ランクID（NULLは全員閲覧可）                                   |
| is_active           | BOOLEAN      | NOT NULL, DEFAULT TRUE        | 有効フラグ                                                             |
| created_at          | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 作成日時                                                               |
| updated_at          | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | 更新日時                                                               |

**インデックス**: UNIQUE ON (scope, slug), idx ON (scope, sort_order), idx ON (required_rank_id)

---

### 23-2. `tags` — タグ

| カラム名    | 型          | 制約                          | 説明                 |
| ----------- | ----------- | ----------------------------- | -------------------- |
| id          | UUID        | PK, DEFAULT gen_random_uuid() | ID                   |
| name        | VARCHAR(50) | NOT NULL                      | タグ名               |
| slug        | VARCHAR(50) | NOT NULL, UNIQUE              | スラッグ             |
| usage_count | INTEGER     | NOT NULL, DEFAULT 0           | 使用数（キャッシュ） |
| created_at  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 作成日時             |

---

### 23-3. `files` — ファイル

AWS S3 / Cloudflare R2 に保存されたファイルのメタデータ。

| カラム名              | 型           | 制約                                                                                  | 説明                     |
| --------------------- | ------------ | ------------------------------------------------------------------------------------- | ------------------------ |
| id                    | UUID         | PK, DEFAULT gen_random_uuid()                                                         | ID                       |
| uploaded_by_user_id   | UUID         | FK → users.id, NOT NULL                                                               | アップロード者ユーザーID |
| original_name         | VARCHAR(255) | NOT NULL                                                                              | 元ファイル名             |
| storage_key           | VARCHAR(500) | NOT NULL, UNIQUE                                                                      | ストレージキー（S3 key） |
| storage_bucket        | VARCHAR(100) | NOT NULL                                                                              | ストレージバケット名     |
| content_type          | VARCHAR(100) | NOT NULL                                                                              | Content-Type（MIME）     |
| file_size_bytes       | BIGINT       | NOT NULL                                                                              | ファイルサイズ（バイト） |
| file_category         | VARCHAR(20)  | NOT NULL, DEFAULT 'general', CHECK IN ('avatar','image','video','document','general') | ファイルカテゴリ         |
| image_width           | INTEGER      | NULL                                                                                  | 画像幅（px）             |
| image_height          | INTEGER      | NULL                                                                                  | 画像高さ（px）           |
| thumbnail_storage_key | VARCHAR(500) | NULL                                                                                  | サムネイルストレージキー |
| checksum_sha256       | VARCHAR(64)  | NULL                                                                                  | SHA-256チェックサム      |
| is_public             | BOOLEAN      | NOT NULL, DEFAULT FALSE                                                               | 公開フラグ               |
| public_url            | VARCHAR(500) | NULL                                                                                  | 公開URL（CDN）           |
| created_at            | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                                               | 作成日時                 |
| deleted_at            | TIMESTAMPTZ  | NULL                                                                                  | 論理削除日時             |

**インデックス**: idx ON (created_at DESC), idx ON (storage_key), idx ON (uploaded_by_user_id)

---

## ER リレーション概要

### コアリレーション

```
users (1) ──< social_accounts (N)
users (N) >── member_ranks (1)
feature_settings (1) ──< permission_settings (N)   ※ feature_key で紐付け
```

### コンテンツリレーション（掲示板例）

```
users ──< board_posts ──< board_comments（自己参照でネスト）
board_posts >──< board_post_tags >──< tags
board_posts >── categories
```

### EC リレーション

```
users ──< products ──< product_images ──< files
users ──< carts ──< cart_items >── products
users ──< orders ──< order_items >── products
orders ──< payments ──< payment_refunds
```

### ポイントリレーション

```
users ──< point_balances
users ──< point_transactions
point_rules（トリガー） → point_transactions
```

---

## 補足: 運用に関する設計メモ

1. **パーティショニング対象**: `activity_logs`, `audit_logs`, `chat_messages`, `advertisement_events` は月次パーティション推奨
2. **カウンターキャッシュ**: `comment_count`, `view_count`, `member_count`, `sales_count` 等はトリガーまたはアプリ層で更新、定期整合性チェックジョブ実行
3. **ポイント失効処理**: 日次バッチで `expires_at <= NOW() AND remaining_amount > 0` を検出し、失効エントリ作成・残高更新
4. **論理削除**: `deleted_at` を持つテーブルでは `WHERE deleted_at IS NULL` の部分インデックスを設定
5. **暗号化対象**: `social_accounts.access_token` はアプリ層で AES-256-GCM 暗号化
6. **日本語全文検索**: `board_posts.body`, `products.name` 等は pgroonga 拡張 + GIN インデックス
7. **UUID v7**: 時刻順序付き UUID を使用し B-tree インデックス性能向上と自然な時系列ソートを実現
8. **マルチコミュニティ拡張**: 将来的に複数コミュニティ対応が必要な場合は、`communities` テーブルを追加し各テーブルに `community_id` FK を付与することで対応可能
9. **機能設定（共通/オプション）**: `feature_settings` テーブルで各機能モジュールの有効/無効を管理。`category = 'common'` の機能は無効化不可（アプリ層で制御）。オプション機能を無効にした場合、該当モジュールの画面はメニューから非表示となり、APIはアクセス拒否（403）を返す。既存データは保持され、再有効化時に復元される
10. **権限チェックフロー**: API リクエスト受信 → ① `feature_settings.is_enabled` 確認 → ② `permission_settings` でロール・ランク確認 → ③ ビジネスロジック実行
