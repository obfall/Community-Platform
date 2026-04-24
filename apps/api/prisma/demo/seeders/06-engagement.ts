import type {
  PrismaClient,
  PointTransactionType,
  PointTriggerEvent,
  SurveyStatus,
  SkillListingStatus,
  SkillBookingStatus,
  SkillFormat,
} from "@prisma/client";
import { pick, pickMany, randInt, rand } from "../helpers/random";
import { daysAgo, daysAhead, hoursAgo } from "../helpers/dates";

interface UserSummary {
  id: string;
  email: string;
  role: string;
  status: string;
}

const POINT_RULES: Array<{
  name: string;
  trigger: PointTriggerEvent;
  amount: number;
  expiryDays: number;
}> = [
  { name: "デイリーログイン", trigger: "daily_login", amount: 10, expiryDays: 180 },
  { name: "投稿作成", trigger: "board_post", amount: 50, expiryDays: 180 },
  { name: "イベント参加", trigger: "event_attendance", amount: 100, expiryDays: 365 },
  { name: "動画視聴完了", trigger: "video_complete", amount: 30, expiryDays: 180 },
  { name: "アンケート回答", trigger: "survey_complete", amount: 20, expiryDays: 90 },
  { name: "商品購入", trigger: "product_purchase", amount: 200, expiryDays: 365 },
];

async function getDemoUsers(prisma: PrismaClient): Promise<UserSummary[]> {
  return await prisma.user.findMany({
    where: { email: { endsWith: "@test.com" } },
    select: { id: true, email: true, role: true, status: true },
    orderBy: { createdAt: "asc" },
  });
}

async function seedPoints(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const admin = users.find((u) => u.role === "admin");
  const activeUsers = users.filter((u) => u.status === "active");

  // PointRule
  await prisma.pointRule.createMany({
    data: POINT_RULES.map((r) => ({
      name: r.name,
      triggerEvent: r.trigger,
      pointAmount: r.amount,
      expiryDays: r.expiryDays,
      isActive: true,
    })),
  });

  // PointSummary + PointHistory per user
  const txTypes: PointTransactionType[] = [
    "admin_grant",
    "rule_grant",
    "utilization",
    "event_grant",
    "admin_adjust",
  ];

  for (const [idx, u] of users.entries()) {
    if (u.status === "withdrawn") continue;

    const bucket = idx < 3 ? "high" : idx < 13 ? "mid" : idx < 20 ? "low" : "zero";
    const targetBalance =
      bucket === "high"
        ? randInt(5000, 10000)
        : bucket === "mid"
          ? randInt(500, 2000)
          : bucket === "low"
            ? randInt(10, 400)
            : 0;

    const totalGranted = targetBalance + randInt(100, 500);
    const totalUtilized = totalGranted - targetBalance;
    const availablePoints = targetBalance;

    await prisma.pointSummary.create({
      data: {
        userId: u.id,
        totalGranted,
        totalUtilized,
        totalExpired: 0,
        availablePoints,
        lastActivityAt: daysAgo(randInt(0, 30)),
      },
    });

    // PointHistory: 5〜15 件
    const count = bucket === "zero" ? randInt(0, 2) : randInt(5, 15);
    let remaining = 0;
    for (let i = 0; i < count; i++) {
      const type = pick(txTypes);
      const isNegative = type === "utilization";
      const points = isNegative ? -randInt(10, 300) : randInt(10, 500);
      remaining += points;
      const expiryBase = daysAhead(randInt(30, 180));
      const isExpiringSoon = idx < 5 && rand() < 0.3;

      await prisma.pointHistory.create({
        data: {
          userId: u.id,
          points,
          type,
          description: type === "utilization" ? "商品購入に利用" : "ルール付与",
          remainingPoints: Math.max(0, remaining),
          expiresAt: isNegative ? null : isExpiringSoon ? daysAhead(randInt(1, 7)) : expiryBase,
          grantedByUserId:
            type === "admin_grant" || type === "admin_adjust" ? (admin?.id ?? null) : null,
          createdAt: daysAgo(randInt(1, 60)),
        },
      });
    }
  }
}

async function seedSurveys(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const admin = users.find((u) => u.role === "admin");
  const owners = users.filter((u) => u.role === "owner");
  if (!admin) return;
  const creators = [admin, ...owners];
  const activeUsers = users.filter((u) => u.status === "active");

  interface SurveyDef {
    title: string;
    status: SurveyStatus;
    targetType: "all" | "rank" | "custom";
    isAnonymous: boolean;
    questionTypes: Array<"single_choice" | "multi_choice" | "text" | "rating" | "number">;
    responseRate: number; // 0 to 1
  }

  const defs: SurveyDef[] = [
    {
      title: "【下書き】新機能に関する意見募集",
      status: "draft",
      targetType: "all",
      isAnonymous: false,
      questionTypes: ["single_choice", "text"],
      responseRate: 0,
    },
    {
      title: "コミュニティ改善アンケート",
      status: "active",
      targetType: "all",
      isAnonymous: false,
      questionTypes: ["rating", "text", "multi_choice"],
      responseRate: 0.3,
    },
    {
      title: "イベント満足度調査",
      status: "active",
      targetType: "all",
      isAnonymous: true,
      questionTypes: ["rating", "single_choice", "text"],
      responseRate: 0.4,
    },
    {
      title: "人気テーマ調査",
      status: "active",
      targetType: "all",
      isAnonymous: false,
      questionTypes: ["multi_choice", "text"],
      responseRate: 0.85,
    },
    {
      title: "会員満足度調査",
      status: "active",
      targetType: "all",
      isAnonymous: false,
      questionTypes: ["rating", "rating", "text"],
      responseRate: 0.9,
    },
    {
      title: "【終了】年末振り返りアンケート",
      status: "closed",
      targetType: "all",
      isAnonymous: false,
      questionTypes: ["rating", "multi_choice", "text"],
      responseRate: 1.0,
    },
    {
      title: "【終了】来年度の企画要望",
      status: "closed",
      targetType: "all",
      isAnonymous: false,
      questionTypes: ["multi_choice", "text", "rating"],
      responseRate: 1.0,
    },
    {
      title: "【終了】利用頻度アンケート",
      status: "closed",
      targetType: "all",
      isAnonymous: true,
      questionTypes: ["number", "rating"],
      responseRate: 0.7,
    },
  ];

  for (const def of defs) {
    const creator = pick(creators);
    const survey = await prisma.survey.create({
      data: {
        title: def.title,
        description: "アンケートにご協力ください。",
        isAnonymous: def.isAnonymous,
        status: def.status,
        targetType: def.targetType,
        startsAt: def.status !== "draft" ? daysAgo(randInt(5, 30)) : null,
        endsAt:
          def.status === "closed"
            ? daysAgo(randInt(1, 10))
            : def.status === "active"
              ? daysAhead(randInt(5, 20))
              : null,
        createdByUserId: creator.id,
      },
      select: { id: true },
    });

    const questionIds: string[] = [];
    const questionTypeMap: Record<
      string,
      "single_choice" | "multi_choice" | "text" | "rating" | "number"
    > = {};
    for (const [idx, qt] of def.questionTypes.entries()) {
      const q = await prisma.surveyQuestion.create({
        data: {
          surveyId: survey.id,
          questionType: qt,
          questionText:
            qt === "text"
              ? "自由にご意見ください。"
              : qt === "rating"
                ? "満足度を 5 段階で評価してください。"
                : qt === "number"
                  ? "月にどのくらい利用しますか？（回）"
                  : qt === "multi_choice"
                    ? "該当するものを選んでください（複数選択可）"
                    : "該当するものを 1 つ選んでください",
          isRequired: idx === 0,
          sortOrder: idx,
          options:
            qt === "single_choice"
              ? ["とても満足", "満足", "普通", "不満"]
              : qt === "multi_choice"
                ? ["機能A", "機能B", "機能C", "機能D", "その他"]
                : undefined,
          minValue: qt === "rating" ? 1 : qt === "number" ? 0 : null,
          maxValue: qt === "rating" ? 5 : qt === "number" ? 100 : null,
        },
        select: { id: true },
      });
      questionIds.push(q.id);
      questionTypeMap[q.id] = qt;
    }

    // Responses
    if (def.responseRate > 0) {
      const respondentCount = Math.floor(activeUsers.length * def.responseRate);
      const respondents = pickMany(activeUsers, respondentCount);
      for (const u of respondents) {
        try {
          const resp = await prisma.surveyResponse.create({
            data: {
              surveyId: survey.id,
              respondentUserId: def.isAnonymous ? null : u.id,
              submittedAt: daysAgo(randInt(1, 30)),
            },
            select: { id: true },
          });
          for (const qId of questionIds) {
            const qt = questionTypeMap[qId]!;
            let selectedOptions: string[] | null = null;
            let textValue: string | null = null;
            let numericValue: number | null = null;
            if (qt === "single_choice")
              selectedOptions = [pick(["とても満足", "満足", "普通", "不満"])];
            else if (qt === "multi_choice")
              selectedOptions = pickMany(
                ["機能A", "機能B", "機能C", "機能D", "その他"],
                randInt(1, 3),
              );
            else if (qt === "text")
              textValue = "ありがとうございました。今後もよろしくお願いします。";
            else if (qt === "rating") numericValue = randInt(3, 5);
            else if (qt === "number") numericValue = randInt(1, 30);

            await prisma.surveyAnswer.create({
              data: {
                responseId: resp.id,
                questionId: qId,
                selectedOptions: selectedOptions as any,
                textValue,
                numericValue,
              },
            });
          }
        } catch {
          // unique violations
        }
      }

      await prisma.survey.update({
        where: { id: survey.id },
        data: { responseCount: respondentCount },
      });
    }
  }
}

async function seedSkills(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const activeMembers = users.filter(
    (u) => u.status === "active" && (u.role === "member" || u.role === "owner"),
  );
  if (activeMembers.length < 4) return;

  interface ListingDef {
    title: string;
    status: SkillListingStatus;
    price: number;
    duration: number;
    format: SkillFormat;
    bookings: number;
  }

  const defs: ListingDef[] = [
    {
      title: "【下書き】ヨガレッスン",
      status: "draft",
      price: 3000,
      duration: 60,
      format: "offline",
      bookings: 0,
    },
    {
      title: "オンライン英会話レッスン",
      status: "active",
      price: 2500,
      duration: 30,
      format: "online",
      bookings: 0,
    },
    {
      title: "写真撮影のコツ教えます",
      status: "active",
      price: 0,
      duration: 60,
      format: "offline",
      bookings: 0,
    },
    {
      title: "プログラミング初心者向け相談",
      status: "active",
      price: 5000,
      duration: 90,
      format: "online",
      bookings: 0,
    },
    {
      title: "料理の基本レッスン",
      status: "active",
      price: 4000,
      duration: 120,
      format: "offline",
      bookings: 2,
    },
    {
      title: "デザイン相談",
      status: "active",
      price: 3500,
      duration: 60,
      format: "both",
      bookings: 3,
    },
    {
      title: "キャリア相談",
      status: "active",
      price: 0,
      duration: 45,
      format: "online",
      bookings: 1,
    },
    {
      title: "投資の基礎解説",
      status: "active",
      price: 6000,
      duration: 60,
      format: "online",
      bookings: 1,
    },
    {
      title: "【停止中】一時停止レッスン",
      status: "inactive",
      price: 3000,
      duration: 60,
      format: "online",
      bookings: 0,
    },
    {
      title: "【終了】過去に実施済みレッスン",
      status: "inactive",
      price: 2000,
      duration: 45,
      format: "offline",
      bookings: 0,
    },
  ];

  const listingIds: string[] = [];
  const listingProviders = new Map<string, UserSummary>();

  for (const def of defs) {
    const provider = pick(activeMembers);
    const listing = await prisma.skillListing.create({
      data: {
        providerUserId: provider.id,
        title: def.title,
        description: "スキルの詳細をここに記載します。ご興味あれば予約してください。",
        price: def.price,
        durationMinutes: def.duration,
        format: def.format,
        status: def.status,
        bookingCount: def.bookings,
      },
      select: { id: true },
    });
    listingIds.push(listing.id);
    listingProviders.set(listing.id, provider);
  }

  // Bookings - create 15 total
  const activeListings = listingIds.slice(1, 9); // skip draft
  for (let i = 0; i < 15; i++) {
    const listingId = pick(activeListings);
    const provider = listingProviders.get(listingId)!;
    const requester = pick(activeMembers.filter((u) => u.id !== provider.id));
    const r = rand();
    const status: SkillBookingStatus =
      r < 0.2
        ? "requested"
        : r < 0.4
          ? "approved"
          : r < 0.7
            ? "completed"
            : r < 0.85
              ? "canceled"
              : "rejected";
    const scheduled = daysAgo(randInt(1, 45));

    const booking = await prisma.skillBooking.create({
      data: {
        skillListingId: listingId,
        requesterUserId: requester.id,
        providerUserId: provider.id,
        status,
        scheduledAt: scheduled,
        message: "よろしくお願いします。",
        completedAt: status === "completed" ? scheduled : null,
        canceledAt: status === "canceled" || status === "rejected" ? daysAgo(randInt(1, 20)) : null,
      },
      select: { id: true },
    });

    // Messages (2-6 per booking)
    const msgCount = randInt(2, 6);
    for (let m = 0; m < msgCount; m++) {
      await prisma.skillMessage.create({
        data: {
          bookingId: booking.id,
          senderUserId: m % 2 === 0 ? requester.id : provider.id,
          body:
            m === 0
              ? "ご予約ありがとうございます。"
              : m % 2 === 0
                ? "日程調整をお願いできますか？"
                : "了解しました。",
        },
      });
    }

    // Comment for completed bookings (50%)
    if (status === "completed" && rand() < 0.6) {
      await prisma.skillComment.create({
        data: {
          skillListingId: listingId,
          authorUserId: requester.id,
          body: "とても分かりやすく教えていただきました。ありがとうございました！",
        },
      });
    }
  }
}

export async function seedEngagement(prisma: PrismaClient): Promise<void> {
  const users = await getDemoUsers(prisma);
  if (users.length === 0) {
    console.log("  [06-engagement] no demo users; skipping");
    return;
  }

  console.log("  [06-engagement] points (rules / summaries / histories)");
  await seedPoints(prisma, users);

  console.log("  [06-engagement] surveys / responses / answers");
  await seedSurveys(prisma, users);

  console.log("  [06-engagement] skill listings / bookings / messages / comments");
  await seedSkills(prisma, users);

  console.log("  [06-engagement] done");
}
