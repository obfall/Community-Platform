import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL,
});

async function main() {
  // --- Member Ranks ---
  const ranks = [
    { name: "一般会員", slug: "general", color: "#6B7280", sortOrder: 0, isDefault: true },
    { name: "VIP会員", slug: "vip", color: "#F59E0B", sortOrder: 1, isDefault: false },
    { name: "プレミアム会員", slug: "premium", color: "#8B5CF6", sortOrder: 2, isDefault: false },
  ];

  for (const rank of ranks) {
    await prisma.memberRank.upsert({
      where: { slug: rank.slug },
      update: {},
      create: rank,
    });
  }
  console.log(`Seeded ${ranks.length} member ranks`);

  // --- Feature Settings (28 features: 11 common + 17 optional) ---
  const features = [
    // Common (11) — 常に有効、無効化不可
    {
      featureKey: "auth",
      featureName: "ログイン・認証",
      category: "common" as const,
      description: "登録・ログイン・パスワードリセット等",
      sortOrder: 1,
    },
    {
      featureKey: "news",
      featureName: "新着情報",
      category: "common" as const,
      description: "更新通知機能",
      sortOrder: 2,
    },
    {
      featureKey: "notification",
      featureName: "通知",
      category: "common" as const,
      description: "システム通知・ベルアイコン",
      sortOrder: 3,
    },
    {
      featureKey: "member",
      featureName: "メンバー",
      category: "common" as const,
      description: "メンバー一覧・検索",
      sortOrder: 4,
    },
    {
      featureKey: "manager",
      featureName: "マネージャー",
      category: "common" as const,
      description: "管理機能アクセス",
      sortOrder: 5,
    },
    {
      featureKey: "visitor",
      featureName: "ビジター",
      category: "common" as const,
      description: "ゲスト機能",
      sortOrder: 6,
    },
    {
      featureKey: "moderation",
      featureName: "モデレーション",
      category: "common" as const,
      description: "コンテンツ検査・削除",
      sortOrder: 7,
    },
    {
      featureKey: "usage_history",
      featureName: "利用履歴管理",
      category: "common" as const,
      description: "ログイン履歴・操作ログ",
      sortOrder: 8,
    },
    {
      featureKey: "profile",
      featureName: "プロフィール",
      category: "common" as const,
      description: "プロフィール編集",
      sortOrder: 9,
    },
    {
      featureKey: "calendar",
      featureName: "カレンダー",
      category: "common" as const,
      description: "統合カレンダー",
      sortOrder: 10,
    },
    {
      featureKey: "memo",
      featureName: "メモ",
      category: "common" as const,
      description: "メモ機能",
      sortOrder: 11,
    },

    // Optional (17) — 管理者が有効/無効を切替可能
    {
      featureKey: "event",
      featureName: "イベント",
      category: "optional" as const,
      description: "イベント告知・参加機能",
      sortOrder: 12,
    },
    {
      featureKey: "board",
      featureName: "掲示板",
      category: "optional" as const,
      description: "掲示板投稿・コメント",
      sortOrder: 13,
    },
    {
      featureKey: "video",
      featureName: "動画",
      category: "optional" as const,
      description: "動画配信・視聴管理",
      sortOrder: 14,
    },
    {
      featureKey: "chat",
      featureName: "チャット",
      category: "optional" as const,
      description: "DM・グループチャット",
      sortOrder: 15,
    },
    {
      featureKey: "project",
      featureName: "プロジェクト",
      category: "optional" as const,
      description: "プロジェクト・部活機能",
      sortOrder: 16,
    },
    {
      featureKey: "ec_shop",
      featureName: "EC・ショップ",
      category: "optional" as const,
      description: "商品販売・注文管理",
      sortOrder: 17,
    },
    {
      featureKey: "point",
      featureName: "ポイント",
      category: "optional" as const,
      description: "ポイント発行・使用",
      sortOrder: 18,
    },
    {
      featureKey: "skill_share",
      featureName: "スキルシェア",
      category: "optional" as const,
      description: "スキル出品・予約",
      sortOrder: 19,
    },
    {
      featureKey: "survey",
      featureName: "アンケート",
      category: "optional" as const,
      description: "アンケート作成・集計",
      sortOrder: 20,
    },
    {
      featureKey: "advertising",
      featureName: "広告",
      category: "optional" as const,
      description: "広告掲載・計測",
      sortOrder: 21,
    },
    {
      featureKey: "mail_campaign",
      featureName: "メール配信",
      category: "optional" as const,
      description: "一括メール送信・テンプレート",
      sortOrder: 22,
    },
    {
      featureKey: "line_integration",
      featureName: "LINE連携",
      category: "optional" as const,
      description: "LINE認証・プッシュ通知",
      sortOrder: 23,
    },
    {
      featureKey: "orientation",
      featureName: "オリエンテーション",
      category: "optional" as const,
      description: "新規会員用案内ページ",
      sortOrder: 24,
    },
    {
      featureKey: "analytics",
      featureName: "アナリティクス",
      category: "optional" as const,
      description: "ダッシュボード・分析",
      sortOrder: 25,
    },
    {
      featureKey: "album",
      featureName: "アルバム",
      category: "optional" as const,
      description: "写真管理・アルバム",
      sortOrder: 26,
    },
    {
      featureKey: "venue",
      featureName: "施設・会場",
      category: "optional" as const,
      description: "施設予約・スペース管理",
      sortOrder: 27,
    },
    {
      featureKey: "content",
      featureName: "コンテンツ",
      category: "optional" as const,
      description: "コンテンツ管理",
      sortOrder: 28,
    },
  ];

  for (const feature of features) {
    await prisma.featureSetting.upsert({
      where: { featureKey: feature.featureKey },
      update: {},
      create: {
        ...feature,
        isEnabled: true,
      },
    });
  }
  console.log(`Seeded ${features.length} feature settings`);

  // --- App Settings ---
  const appSettings = [
    {
      key: "site_name",
      value: "Community Platform",
      valueType: "string" as const,
      description: "サイト名",
    },
    {
      key: "site_description",
      value: "コミュニティプラットフォーム",
      valueType: "string" as const,
      description: "サイト説明",
    },
    {
      key: "max_upload_size_mb",
      value: "10",
      valueType: "integer" as const,
      description: "最大アップロードサイズ（MB）",
    },
    {
      key: "allow_registration",
      value: "true",
      valueType: "boolean" as const,
      description: "新規登録を許可するか",
    },
    {
      key: "default_language",
      value: "ja",
      valueType: "string" as const,
      description: "デフォルト言語",
    },
  ];

  for (const setting of appSettings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`Seeded ${appSettings.length} app settings`);

  // --- Board Categories ---
  // createdByUserId が必要なため、最初のユーザーを探すか、存在しなければスキップ
  const firstUser = await prisma.user.findFirst({
    where: { role: "owner", deletedAt: null },
    select: { id: true },
  });

  if (firstUser) {
    const boardCategories = [
      { name: "お知らせ", description: "運営からのお知らせ", sortOrder: 0 },
      { name: "雑談", description: "自由な話題", sortOrder: 1 },
      { name: "質問・相談", description: "質問や相談を投稿できます", sortOrder: 2 },
      { name: "イベント関連", description: "イベントに関する話題", sortOrder: 3 },
      { name: "自己紹介", description: "自己紹介をしましょう", sortOrder: 4 },
    ];

    for (const category of boardCategories) {
      const existing = await prisma.boardCategory.findFirst({
        where: { name: category.name, deletedAt: null },
      });
      if (!existing) {
        await prisma.boardCategory.create({
          data: { ...category, createdByUserId: firstUser.id },
        });
      }
    }
    console.log(`Seeded ${boardCategories.length} board categories`);
  } else {
    console.log("Skipped board categories (no owner user found)");
  }

  // --- Mail Templates ---
  const mailTemplates = [
    {
      name: "イベント案内",
      category: "event" as const,
      subjectTemplate: "【{{site_name}}】{{event_title}} のご案内",
      bodyHtmlTemplate: `<h1>{{event_title}}</h1>
<p>{{user_name}} 様</p>
<p>以下のイベントが公開されました。</p>
<ul>
  <li>日時: {{start_at}}</li>
  <li>会場: {{venue_name}}</li>
  <li>住所: {{venue_address}}</li>
</ul>
<p>キャンセルポリシー: {{cancellation_policy}}</p>`,
      bodyTextTemplate: `{{event_title}}

{{user_name}} 様

以下のイベントが公開されました。

日時: {{start_at}}
会場: {{venue_name}}
住所: {{venue_address}}

キャンセルポリシー: {{cancellation_policy}}`,
      availableVariables: [
        "site_name",
        "user_name",
        "event_title",
        "start_at",
        "venue_name",
        "venue_address",
        "cancellation_policy",
      ],
      sortOrder: 0,
    },
    {
      name: "一般配信",
      category: "general" as const,
      subjectTemplate: "【{{site_name}}】{{subject}}",
      bodyHtmlTemplate: `<p>{{user_name}} 様</p>
<div>{{body}}</div>`,
      bodyTextTemplate: `{{user_name}} 様

{{body}}`,
      availableVariables: ["site_name", "user_name", "subject", "body"],
      sortOrder: 1,
    },
    {
      name: "イベントリマインダー",
      category: "event" as const,
      subjectTemplate: "【リマインド】{{event_title}} は明日開催です",
      bodyHtmlTemplate: `<h1>{{event_title}} リマインダー</h1>
<p>{{user_name}} 様</p>
<p>明日開催予定のイベントをお知らせします。</p>
<ul>
  <li>日時: {{start_at}}</li>
  <li>会場: {{venue_name}}</li>
  <li>住所: {{venue_address}}</li>
</ul>`,
      bodyTextTemplate: `{{event_title}} リマインダー

{{user_name}} 様

明日開催予定のイベントをお知らせします。

日時: {{start_at}}
会場: {{venue_name}}
住所: {{venue_address}}`,
      availableVariables: ["user_name", "event_title", "start_at", "venue_name", "venue_address"],
      sortOrder: 2,
    },
  ];

  for (const tmpl of mailTemplates) {
    const existing = await prisma.mailTemplate.findFirst({
      where: { name: tmpl.name },
    });
    if (!existing) {
      await prisma.mailTemplate.create({ data: tmpl });
    }
  }
  console.log(`Seeded ${mailTemplates.length} mail templates`);

  // --- Member Attributes ---
  const memberAttributes = [
    {
      name: "入会動機",
      slug: "join_reason",
      type: "text" as const,
      isRequired: false,
      sortOrder: 0,
    },
    {
      name: "参加可能曜日",
      slug: "available_days",
      type: "multi_select" as const,
      options: ["月", "火", "水", "木", "金", "土", "日"],
      isRequired: false,
      sortOrder: 1,
    },
    {
      name: "スキルレベル",
      slug: "skill_level",
      type: "select" as const,
      options: ["初級", "中級", "上級"],
      isRequired: false,
      sortOrder: 2,
    },
  ];

  for (const attr of memberAttributes) {
    await prisma.memberAttribute.upsert({
      where: { slug: attr.slug },
      update: {},
      create: attr,
    });
  }
  console.log(`Seeded ${memberAttributes.length} member attributes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
