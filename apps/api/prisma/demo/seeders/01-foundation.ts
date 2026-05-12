import type { PrismaClient } from "@prisma/client";
import { DEMO_USERS } from "../fixtures/users";
import type { DemoUserFixture } from "../fixtures/users";
import { getDemoPasswordHash } from "../helpers/hash";
import { createFileRecord } from "../helpers/file-factory";
import { pick, pickMany, randInt, rand, randomBoolean } from "../helpers/random";
import { daysAgo, SEED_BASE_DATE } from "../helpers/dates";

const INTEREST_CATEGORIES = [
  { slug: "music", name: "音楽" },
  { slug: "reading", name: "読書" },
  { slug: "cooking", name: "料理" },
  { slug: "travel", name: "旅行" },
  { slug: "sports", name: "スポーツ" },
  { slug: "games", name: "ゲーム" },
  { slug: "movies", name: "映画" },
  { slug: "art", name: "アート" },
];

const DEMO_TAGS = [
  { slug: "demo-important", name: "重要" },
  { slug: "demo-new", name: "新着" },
  { slug: "demo-event", name: "イベント" },
  { slug: "demo-info", name: "お知らせ" },
  { slug: "demo-tech", name: "技術" },
  { slug: "demo-beginner", name: "初心者向け" },
  { slug: "demo-advanced", name: "上級者向け" },
  { slug: "demo-recruiting", name: "募集中" },
  { slug: "demo-completed", name: "終了" },
  { slug: "demo-limited", name: "限定" },
  { slug: "demo-popular", name: "人気" },
  { slug: "demo-must", name: "必見" },
  { slug: "demo-discussion", name: "討論" },
  { slug: "demo-question", name: "質問" },
  { slug: "demo-tips", name: "Tips" },
  { slug: "demo-review", name: "レビュー" },
];

const LANGUAGES: Array<{
  code: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "native";
}> = [
  { code: "ja", proficiency: "native" },
  { code: "en", proficiency: "intermediate" },
  { code: "zh", proficiency: "beginner" },
  { code: "ko", proficiency: "beginner" },
  { code: "fr", proficiency: "beginner" },
];

const AFFILIATIONS = [
  { org: "株式会社サンプル", title: "エンジニア", role: "バックエンド開発" },
  { org: "サンプル商事", title: "営業", role: "法人営業" },
  { org: "フリーランス", title: "デザイナー", role: "UI/UX" },
  { org: "株式会社テック", title: "プロダクトマネージャー", role: "新規事業" },
  { org: "個人事業主", title: "コンサルタント", role: "マーケティング支援" },
];

const JOIN_REASONS = ["友人紹介", "ウェブ検索", "SNS 広告", "イベント参加後", "その他"];
const SKILL_LEVELS = ["初級", "中級", "上級"];
const DAYS_OF_WEEK = ["月", "火", "水", "木", "金", "土", "日"];
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
];

async function seedCategories(prisma: PrismaClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const [idx, cat] of INTEREST_CATEGORIES.entries()) {
    const created = await prisma.category.create({
      data: {
        scope: "user_interest",
        slug: cat.slug,
        name: cat.name,
        sortOrder: idx,
      },
      select: { id: true },
    });
    map.set(cat.slug, created.id);
  }
  return map;
}

async function seedTags(prisma: PrismaClient): Promise<void> {
  await prisma.tag.createMany({
    data: DEMO_TAGS.map((t) => ({ slug: t.slug, name: t.name })),
  });
}

async function seedUsers(prisma: PrismaClient): Promise<Map<string, string>> {
  const passwordHash = await getDemoPasswordHash();
  const defaultRank = await prisma.memberRank.findUnique({ where: { slug: "general" } });

  const map = new Map<string, string>();

  for (const fixture of DEMO_USERS) {
    const joinedAt = daysAgo(randInt(30, 365));
    const isWithdrawn = fixture.status === "withdrawn";
    const isSuspended = fixture.status === "suspended";
    const lastLoginAt = isWithdrawn
      ? daysAgo(randInt(60, 120))
      : isSuspended
        ? daysAgo(randInt(20, 45))
        : daysAgo(randInt(0, 14));

    const created = await prisma.user.create({
      data: {
        email: fixture.email,
        passwordHash,
        name: fixture.name,
        role: fixture.role,
        status: fixture.status,
        isAdmin: fixture.isAdmin,
        isActive: !isSuspended && !isWithdrawn,
        rankId: fixture.role === "member" && defaultRank ? defaultRank.id : null,
        emailVerifiedAt: joinedAt,
        joinedAt,
        lastLoginAt,
        deletedAt: isWithdrawn ? daysAgo(randInt(10, 60)) : null,
      },
      select: { id: true },
    });
    map.set(fixture.slug, created.id);
  }
  return map;
}

async function seedProfilesAndAvatars(
  prisma: PrismaClient,
  userMap: Map<string, string>,
): Promise<void> {
  let avatarIndex = 0;

  for (const fixture of DEMO_USERS) {
    const userId = userMap.get(fixture.slug);
    if (!userId) continue;

    let avatarUrl: string | null = null;

    const wantAvatar =
      fixture.profileGranularity === "full" ||
      fixture.profileGranularity === "mid" ||
      fixture.profileGranularity === "avatar_only" ||
      fixture.profileGranularity === "standard";

    if (wantAvatar) {
      const localPath = `avatars/default-${(avatarIndex % 20) + 1}.svg`;
      avatarIndex++;
      const file = await createFileRecord(prisma, {
        uploadedByUserId: userId,
        category: "avatar",
        originalName: `avatar-${fixture.slug}.svg`,
        contentType: "image/svg+xml",
        localPath,
        imageWidth: 400,
        imageHeight: 400,
        isPublic: true,
      });
      avatarUrl = file.publicUrl;
    }

    await prisma.userProfile.create({
      data: {
        userId,
        avatarUrl,
        gender: fixture.gender ?? null,
        occupation: fixture.profileGranularity === "full" ? (fixture.occupation ?? null) : null,
      },
    });

    if (fixture.profileGranularity === "full" || fixture.profileGranularity === "standard") {
      await prisma.userPublicInfo.create({
        data: {
          userId,
          nickname: fixture.nickname ?? null,
          prefecture: fixture.prefecture ?? null,
          introduction: fixture.profileGranularity === "full" && fixture.bio ? fixture.bio : null,
          publicStatus: "public",
        },
      });
    }
  }
}

async function seedInterests(
  prisma: PrismaClient,
  userMap: Map<string, string>,
  categoryIds: Map<string, string>,
): Promise<void> {
  const catIds = Array.from(categoryIds.values());

  for (const fixture of DEMO_USERS) {
    const userId = userMap.get(fixture.slug);
    if (!userId) continue;
    if (fixture.profileGranularity === "minimal" || fixture.profileGranularity === "avatar_only")
      continue;

    const count =
      fixture.profileGranularity === "full"
        ? randInt(5, 8)
        : fixture.profileGranularity === "mid"
          ? randInt(1, 3)
          : randInt(1, 4);

    const chosen = pickMany(catIds, count);
    for (const categoryId of chosen) {
      await prisma.userInterest.create({
        data: { userId, categoryId },
      });
    }
  }
}

async function seedLanguages(prisma: PrismaClient, userMap: Map<string, string>): Promise<void> {
  for (const fixture of DEMO_USERS) {
    const userId = userMap.get(fixture.slug);
    if (!userId) continue;
    if (fixture.profileGranularity !== "full") continue;

    const count = randInt(2, 3);
    const chosen = pickMany(LANGUAGES, count);
    for (const [idx, lang] of chosen.entries()) {
      await prisma.userLanguage.create({
        data: {
          userId,
          languageCode: lang.code,
          proficiency: lang.proficiency,
          sortOrder: idx,
        },
      });
    }
  }
}

async function seedAffiliations(prisma: PrismaClient, userMap: Map<string, string>): Promise<void> {
  for (const fixture of DEMO_USERS) {
    const userId = userMap.get(fixture.slug);
    if (!userId) continue;
    if (fixture.profileGranularity !== "full") continue;

    const count = randInt(1, 2);
    const chosen = pickMany(AFFILIATIONS, count);
    for (const [idx, aff] of chosen.entries()) {
      await prisma.userAffiliation.create({
        data: {
          userId,
          organizationName: aff.org,
          title: aff.title,
          roleDescription: aff.role,
          sortOrder: idx,
        },
      });
    }
  }
}

async function seedSocialAccounts(
  prisma: PrismaClient,
  userMap: Map<string, string>,
): Promise<void> {
  for (const fixture of DEMO_USERS) {
    if (!fixture.hasGoogleAccount) continue;
    const userId = userMap.get(fixture.slug);
    if (!userId) continue;

    await prisma.socialAccount.create({
      data: {
        userId,
        provider: "google",
        providerUserId: `demo-google-${fixture.slug}`,
      },
    });
  }
}

async function seedLoginHistories(
  prisma: PrismaClient,
  userMap: Map<string, string>,
): Promise<void> {
  const rows: Array<{
    userId: string;
    userAgent: string;
    status: "success" | "failure";
    failureReason: string | null;
    createdAt: Date;
  }> = [];

  for (const fixture of DEMO_USERS) {
    const userId = userMap.get(fixture.slug);
    if (!userId) continue;
    if (fixture.status === "withdrawn") continue;

    const count =
      fixture.role === "admin" || fixture.role === "owner"
        ? randInt(30, 50)
        : fixture.status === "suspended"
          ? randInt(5, 15)
          : randInt(10, 40);

    for (let i = 0; i < count; i++) {
      const daysBack = randInt(0, 60);
      const isFailure = randomBoolean(0.05);
      rows.push({
        userId,
        userAgent: pick(USER_AGENTS),
        status: isFailure ? "failure" : "success",
        failureReason: isFailure ? pick(["invalid_password", "user_not_found"]) : null,
        createdAt: new Date(
          SEED_BASE_DATE.getTime() - daysBack * 24 * 60 * 60 * 1000 + randInt(0, 86400) * 1000,
        ),
      });
    }
  }

  await prisma.loginHistory.createMany({ data: rows });
}

async function seedMemberAttributes(
  prisma: PrismaClient,
  userMap: Map<string, string>,
): Promise<void> {
  const attrs = await prisma.memberAttribute.findMany({
    select: { id: true, slug: true },
  });
  const attrBySlug = new Map(attrs.map((a) => [a.slug, a.id]));

  for (const fixture of DEMO_USERS) {
    const userId = userMap.get(fixture.slug);
    if (!userId) continue;
    if (fixture.status === "withdrawn") continue;

    if (rand() < 0.7 && attrBySlug.get("join_reason")) {
      await prisma.memberAttributeValue.create({
        data: {
          userId,
          attributeId: attrBySlug.get("join_reason")!,
          value: pick(JOIN_REASONS),
        },
      });
    }

    if (rand() < 0.5 && attrBySlug.get("available_days")) {
      const selected = pickMany(DAYS_OF_WEEK, randInt(2, 5));
      await prisma.memberAttributeValue.create({
        data: {
          userId,
          attributeId: attrBySlug.get("available_days")!,
          value: JSON.stringify(selected),
        },
      });
    }

    if (rand() < 0.4 && attrBySlug.get("skill_level")) {
      await prisma.memberAttributeValue.create({
        data: {
          userId,
          attributeId: attrBySlug.get("skill_level")!,
          value: pick(SKILL_LEVELS),
        },
      });
    }
  }
}

async function seedBoardCategories(prisma: PrismaClient, adminUserId: string): Promise<void> {
  const categories = [
    { name: "お知らせ", description: "運営からのお知らせ", sortOrder: 0 },
    { name: "雑談", description: "自由な話題", sortOrder: 1 },
    { name: "質問・相談", description: "質問や相談を投稿できます", sortOrder: 2 },
    { name: "イベント関連", description: "イベントに関する話題", sortOrder: 3 },
    { name: "自己紹介", description: "自己紹介をしましょう", sortOrder: 4 },
    { name: "提案・要望", description: "運営への提案", sortOrder: 5 },
  ];

  for (const cat of categories) {
    const existing = await prisma.boardCategory.findFirst({
      where: { name: cat.name, deletedAt: null },
    });
    if (existing) continue;
    await prisma.boardCategory.create({
      data: { ...cat, createdByUserId: adminUserId },
    });
  }
}

export async function seedFoundation(prisma: PrismaClient): Promise<void> {
  console.log("  [01-foundation] categories");
  const categoryIds = await seedCategories(prisma);

  console.log("  [01-foundation] tags");
  await seedTags(prisma);

  console.log("  [01-foundation] users");
  const userMap = await seedUsers(prisma);

  console.log("  [01-foundation] profiles and avatars");
  await seedProfilesAndAvatars(prisma, userMap);

  console.log("  [01-foundation] interests");
  await seedInterests(prisma, userMap, categoryIds);

  console.log("  [01-foundation] languages");
  await seedLanguages(prisma, userMap);

  console.log("  [01-foundation] affiliations");
  await seedAffiliations(prisma, userMap);

  console.log("  [01-foundation] social accounts");
  await seedSocialAccounts(prisma, userMap);

  console.log("  [01-foundation] login histories");
  await seedLoginHistories(prisma, userMap);

  console.log("  [01-foundation] member attribute values");
  await seedMemberAttributes(prisma, userMap);

  const adminId = userMap.get("sysadmin");
  if (adminId) {
    console.log("  [01-foundation] board categories");
    await seedBoardCategories(prisma, adminId);
  }

  const counts = {
    users: userMap.size,
    categories: categoryIds.size,
    tags: DEMO_TAGS.length,
  };
  console.log(
    `  [01-foundation] done (users=${counts.users}, categories=${counts.categories}, tags=${counts.tags})`,
  );
}
