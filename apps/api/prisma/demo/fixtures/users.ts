import type { UserRole, UserStatus, Gender } from "@prisma/client";

export type ProfileGranularity = "full" | "mid" | "avatar_only" | "minimal" | "standard";

export interface DemoUserFixture {
  slug: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  isAdmin: boolean;
  profileGranularity: ProfileGranularity;
  gender?: Gender;
  hasGoogleAccount?: boolean;
  bio?: string;
  nickname?: string;
  prefecture?: string;
  occupation?: string;
}

// 全ユーザー共通パスワード: qaz1234 (helpers/hash.ts 参照)
// 合計 25 名: admin 1 / owner 2 / member(active) 18 / member(suspended) 2 / member(withdrawn) 1 / visitor 1
export const DEMO_USERS: DemoUserFixture[] = [
  // --- システム管理者 (1) ---
  {
    slug: "sysadmin",
    email: "sysadmin@test.com",
    name: "システム管理者",
    role: "admin",
    status: "active",
    isAdmin: true,
    profileGranularity: "full",
    gender: "prefer_not_to_say",
    bio: "システム全体の管理を担当しています。不具合があればお知らせください。",
    occupation: "システム管理者",
  },

  // --- コミュニティ管理者 (2) ---
  {
    slug: "owner-tanaka",
    email: "tanaka.owner@test.com",
    name: "田中 太郎",
    role: "owner",
    status: "active",
    isAdmin: false,
    profileGranularity: "full",
    gender: "male",
    hasGoogleAccount: true,
    bio: "コミュニティオーナー。皆さんが楽しめる場所作りを心がけています。イベントやキャンペーンは随時企画中。",
    nickname: "たなかさん",
    prefecture: "東京都",
    occupation: "コミュニティマネージャー",
  },
  {
    slug: "owner-sato",
    email: "sato.ops@test.com",
    name: "佐藤 花子",
    role: "owner",
    status: "active",
    isAdmin: false,
    profileGranularity: "full",
    gender: "female",
    bio: "運営サブ担当。イベント企画・投稿モデレーションを主に担当しています。",
    nickname: "さとう",
    prefecture: "大阪府",
    occupation: "運営スタッフ",
  },

  // --- 一般メンバー: full プロフィール (5) ---
  {
    slug: "member-yamada",
    email: "yamada@test.com",
    name: "山田 健一",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "full",
    gender: "male",
    hasGoogleAccount: true,
    bio: "読書と音楽鑑賞が趣味です。最近は料理にもハマっています。週末は家族と旅行に出かけることが多いです。よろしくお願いします！",
    nickname: "やまけん",
    prefecture: "神奈川県",
    occupation: "エンジニア",
  },
  {
    slug: "member-suzuki",
    email: "suzuki@test.com",
    name: "鈴木 美咲",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "full",
    gender: "female",
    bio: "デザイナーをしています。アートや映画鑑賞が好きで、展覧会巡りが休日の楽しみ。コミュニティの皆さんと交流できるのを楽しみにしています。",
    nickname: "みさき",
    prefecture: "東京都",
    occupation: "グラフィックデザイナー",
  },
  {
    slug: "member-takahashi",
    email: "takahashi@test.com",
    name: "高橋 翔太",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "full",
    gender: "male",
    hasGoogleAccount: true,
    bio: "スポーツ観戦が大好きで、週末は必ずスタジアムに足を運んでいます。皆さんで一緒に応援できる仲間を募集中！",
    nickname: "しょうた",
    prefecture: "愛知県",
    occupation: "マーケター",
  },
  {
    slug: "member-ito",
    email: "ito@test.com",
    name: "伊藤 由美",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "full",
    gender: "female",
    bio: "料理とガーデニングが趣味です。自家製野菜で作る料理のレシピをシェアしていきます。",
    nickname: "ゆみこ",
    prefecture: "福岡県",
    occupation: "主婦",
  },
  {
    slug: "member-watanabe",
    email: "watanabe@test.com",
    name: "渡辺 雄介",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "full",
    gender: "male",
    bio: "ゲームと映画が好きな社会人です。最近は動画配信にも興味があって勉強中。コミュニティでいろんな方と知り合いたいです。",
    nickname: "わたなべ",
    prefecture: "北海道",
    occupation: "ITエンジニア",
  },

  // --- 一般メンバー: mid プロフィール (4) ---
  {
    slug: "member-nakamura",
    email: "nakamura@test.com",
    name: "中村 拓也",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "mid",
    gender: "male",
    bio: "よろしくお願いします。",
  },
  {
    slug: "member-kobayashi",
    email: "kobayashi@test.com",
    name: "小林 直子",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "mid",
    gender: "female",
    bio: "コミュニティに参加したばかりです。少しずつ交流していければと思います。",
  },
  {
    slug: "member-kato",
    email: "kato@test.com",
    name: "加藤 大輔",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "mid",
    gender: "male",
    bio: "スポーツと読書が好きです。",
  },
  {
    slug: "member-yoshida",
    email: "yoshida@test.com",
    name: "吉田 真理子",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "mid",
    gender: "female",
    bio: "旅行が大好きです。皆さんおすすめのスポットがあれば教えてください。",
  },

  // --- 一般メンバー: avatar のみ (3) ---
  {
    slug: "member-yamamoto",
    email: "yamamoto@test.com",
    name: "山本 拓海",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "avatar_only",
    gender: "male",
  },
  {
    slug: "member-sasaki",
    email: "sasaki@test.com",
    name: "佐々木 愛",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "avatar_only",
    gender: "female",
  },
  {
    slug: "member-matsumoto",
    email: "matsumoto@test.com",
    name: "松本 光",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "avatar_only",
  },

  // --- 一般メンバー: minimal (2) ---
  {
    slug: "member-inoue",
    email: "inoue@test.com",
    name: "井上 徹",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "minimal",
  },
  {
    slug: "member-kimura",
    email: "kimura@test.com",
    name: "木村 久美子",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "minimal",
  },

  // --- 一般メンバー: standard プロフィール (4) ---
  {
    slug: "member-hayashi",
    email: "hayashi@test.com",
    name: "林 健太",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "standard",
    gender: "male",
    bio: "いろいろ試してみたいタイプです。",
    occupation: "会社員",
  },
  {
    slug: "member-shimizu",
    email: "shimizu@test.com",
    name: "清水 みどり",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "standard",
    gender: "female",
    bio: "お菓子作りが好きです。",
    hasGoogleAccount: true,
  },
  {
    slug: "member-yamaguchi",
    email: "yamaguchi@test.com",
    name: "山口 俊介",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "standard",
    gender: "male",
    bio: "読書会を企画したいと思っています。",
  },
  {
    slug: "member-mori",
    email: "mori@test.com",
    name: "森 彩香",
    role: "member",
    status: "active",
    isAdmin: false,
    profileGranularity: "standard",
    gender: "female",
    bio: "ヨガとランニングが日課です。",
  },

  // --- 特殊ステータス: suspended (2) ---
  {
    slug: "member-abe",
    email: "abe.suspended@test.com",
    name: "安部 和也",
    role: "member",
    status: "suspended",
    isAdmin: false,
    profileGranularity: "avatar_only",
  },
  {
    slug: "member-fujita",
    email: "fujita.suspended@test.com",
    name: "藤田 葵",
    role: "member",
    status: "suspended",
    isAdmin: false,
    profileGranularity: "minimal",
  },

  // --- 特殊ステータス: withdrawn (1) ---
  {
    slug: "member-okada",
    email: "okada.withdrawn@test.com",
    name: "岡田 退会",
    role: "member",
    status: "withdrawn",
    isAdmin: false,
    profileGranularity: "minimal",
  },

  // --- ビジター (1) ---
  {
    slug: "visitor-guest",
    email: "guest.visitor@test.com",
    name: "ゲスト 見学者",
    role: "visitor",
    status: "active",
    isAdmin: false,
    profileGranularity: "mid",
    bio: "見学中です。",
  },
];
