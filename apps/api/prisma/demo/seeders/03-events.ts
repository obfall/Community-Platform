import type { PrismaClient, EventStatus } from "@prisma/client";
import { pick, pickMany, randInt, rand } from "../helpers/random";
import { daysAgo, daysAhead, hoursAgo } from "../helpers/dates";
import {
  BOARD_TOPIC_TITLES,
  BOARD_POST_BODIES,
  BOARD_COMMENT_BODIES,
} from "../fixtures/text-samples";

interface UserSummary {
  id: string;
  email: string;
  role: string;
  status: string;
}

interface EventDef {
  title: string;
  description: string;
  status: EventStatus;
  daysOffset: number; // 未来(+) / 過去(-)
  locationType: "venue" | "online" | "hybrid";
  capacity: number;
  applicants: number;
  hasApplicationForm: boolean;
  hasResult: boolean;
  executionStatus?: "as_planned" | "modified" | "partially_held" | "postponed" | "canceled";
}

const EVENTS: EventDef[] = [
  // draft × 2
  {
    title: "【下書き】春の交流会",
    description: "春の交流会企画中。",
    status: "draft",
    daysOffset: 30,
    locationType: "venue",
    capacity: 20,
    applicants: 0,
    hasApplicationForm: false,
    hasResult: false,
  },
  {
    title: "【下書き】オンライン勉強会",
    description: "オンライン勉強会企画中。",
    status: "draft",
    daysOffset: 45,
    locationType: "online",
    capacity: 30,
    applicants: 0,
    hasApplicationForm: false,
    hasResult: false,
  },

  // recruiting × 8 (余裕あり4、残り僅か2、満員2)
  {
    title: "カジュアル交流イベント",
    description: "新メンバー歓迎の交流会。",
    status: "recruiting",
    daysOffset: 14,
    locationType: "venue",
    capacity: 30,
    applicants: 8,
    hasApplicationForm: true,
    hasResult: false,
  },
  {
    title: "週末ハイキング",
    description: "一緒に自然を楽しもう。",
    status: "recruiting",
    daysOffset: 20,
    locationType: "venue",
    capacity: 15,
    applicants: 5,
    hasApplicationForm: false,
    hasResult: false,
  },
  {
    title: "オンライン勉強会: 初心者向け",
    description: "基礎から丁寧に解説。",
    status: "recruiting",
    daysOffset: 10,
    locationType: "online",
    capacity: 50,
    applicants: 18,
    hasApplicationForm: true,
    hasResult: false,
  },
  {
    title: "ボードゲーム会",
    description: "気軽に参加できるボードゲーム会。",
    status: "recruiting",
    daysOffset: 17,
    locationType: "venue",
    capacity: 20,
    applicants: 12,
    hasApplicationForm: false,
    hasResult: false,
  },
  {
    title: "【残り僅か】特別講演会",
    description: "注目の講師を招いて。",
    status: "recruiting",
    daysOffset: 7,
    locationType: "hybrid",
    capacity: 30,
    applicants: 27,
    hasApplicationForm: true,
    hasResult: false,
  },
  {
    title: "【残り僅か】ワークショップ",
    description: "人気のワークショップ。",
    status: "recruiting",
    daysOffset: 5,
    locationType: "venue",
    capacity: 15,
    applicants: 13,
    hasApplicationForm: true,
    hasResult: false,
  },
  {
    title: "【満員】年末パーティー",
    description: "年末の交流パーティー。",
    status: "recruiting",
    daysOffset: 3,
    locationType: "venue",
    capacity: 40,
    applicants: 40,
    hasApplicationForm: true,
    hasResult: false,
  },
  {
    title: "【満員】プレミアム会員限定",
    description: "プレミアム会員限定の特別会。",
    status: "recruiting",
    daysOffset: 4,
    locationType: "venue",
    capacity: 10,
    applicants: 10,
    hasApplicationForm: true,
    hasResult: false,
  },

  // closed × 2 (申込締切、未開催)
  {
    title: "【申込締切】明日開催のセミナー",
    description: "開催直前セミナー。",
    status: "closed",
    daysOffset: 1,
    locationType: "venue",
    capacity: 25,
    applicants: 22,
    hasApplicationForm: true,
    hasResult: false,
  },
  {
    title: "【本日開催】当日イベント",
    description: "本日開催。",
    status: "closed",
    daysOffset: 0,
    locationType: "venue",
    capacity: 30,
    applicants: 28,
    hasApplicationForm: true,
    hasResult: false,
  },

  // ended × 6 (実施結果あり3、結果なし2、アーカイブ1)
  {
    title: "先週の勉強会",
    description: "先週実施済み。",
    status: "ended",
    daysOffset: -7,
    locationType: "online",
    capacity: 30,
    applicants: 25,
    hasApplicationForm: true,
    hasResult: true,
    executionStatus: "as_planned",
  },
  {
    title: "先月の大型イベント",
    description: "先月実施した大型イベント。",
    status: "ended",
    daysOffset: -20,
    locationType: "venue",
    capacity: 100,
    applicants: 85,
    hasApplicationForm: true,
    hasResult: true,
    executionStatus: "modified",
  },
  {
    title: "四半期総会",
    description: "四半期総会を実施しました。",
    status: "ended",
    daysOffset: -30,
    locationType: "hybrid",
    capacity: 50,
    applicants: 45,
    hasApplicationForm: false,
    hasResult: true,
    executionStatus: "partially_held",
  },
  {
    title: "先々月のミニイベント",
    description: "小規模イベント。",
    status: "ended",
    daysOffset: -45,
    locationType: "venue",
    capacity: 15,
    applicants: 12,
    hasApplicationForm: false,
    hasResult: false,
  },
  {
    title: "過去のオンラインセミナー",
    description: "過去実施のオンラインセミナー。",
    status: "ended",
    daysOffset: -60,
    locationType: "online",
    capacity: 40,
    applicants: 30,
    hasApplicationForm: true,
    hasResult: false,
  },
  {
    title: "【アーカイブ】半年前の創立記念",
    description: "半年前の特別イベント。",
    status: "ended",
    daysOffset: -200,
    locationType: "venue",
    capacity: 80,
    applicants: 70,
    hasApplicationForm: false,
    hasResult: true,
    executionStatus: "as_planned",
  },

  // canceled × 1
  {
    title: "【中止】来月予定だった交流会",
    description: "会場都合により中止となりました。",
    status: "canceled",
    daysOffset: 40,
    locationType: "venue",
    capacity: 25,
    applicants: 5,
    hasApplicationForm: true,
    hasResult: false,
  },
];

const SPEAKER_NAMES = [
  { name: "外部講師 山田 先生", title: "株式会社サンプル", role: "講師" },
  { name: "外部講師 鈴木 博士", title: "大学研究員", role: "講師" },
  { name: "外部講師 佐々木 氏", title: "フリーランス", role: "ゲスト" },
  { name: "外部講師 田島 氏", title: "IT コンサルタント", role: "司会" },
];

const ORGANIZATIONS = [
  { name: "株式会社パートナーA", role: "協賛" },
  { name: "一般社団法人サポート団体", role: "共催" },
  { name: "地域コミュニティB", role: "協力" },
  { name: "株式会社スポンサーC", role: "スポンサー" },
];

async function getDemoUsers(prisma: PrismaClient): Promise<UserSummary[]> {
  return await prisma.user.findMany({
    where: { email: { endsWith: "@test.com" } },
    select: { id: true, email: true, role: true, status: true },
    orderBy: { createdAt: "asc" },
  });
}

async function seedDiscountCodes(
  prisma: PrismaClient,
  tickets: Array<{ id: string; price: number }>,
): Promise<void> {
  const rows: Array<{
    ticketId: string;
    code: string;
    discountedPrice: number;
    usageLimit: number | null;
    usedCount: number;
    isActive: boolean;
    expiresAt: Date | null;
  }> = [];
  const patterns = [
    { code: "EARLY10", active: true, expired: false, limit: 50, used: 12 },
    { code: "MEMBER20", active: true, expired: false, limit: 30, used: 5 },
    { code: "EXPIRED", active: false, expired: true, limit: 20, used: 20 },
    { code: "VIPONLY", active: true, expired: false, limit: null, used: 3 },
    { code: "PROMO5", active: true, expired: false, limit: 100, used: 0 },
  ];
  for (let i = 0; i < Math.min(patterns.length, tickets.length); i++) {
    const pat = patterns[i]!;
    const tic = tickets[i]!;
    if (tic.price <= 0) continue;
    rows.push({
      ticketId: tic.id,
      code: pat.code,
      discountedPrice: Math.max(0, Math.floor(tic.price * 0.8)),
      usageLimit: pat.limit,
      usedCount: pat.used,
      isActive: pat.active,
      expiresAt: pat.expired ? daysAgo(30) : daysAhead(60),
    });
  }
  if (rows.length > 0) await prisma.eventDiscountCode.createMany({ data: rows });
}

export async function seedEvents(prisma: PrismaClient): Promise<void> {
  const users = await getDemoUsers(prisma);
  if (users.length === 0) {
    console.log("  [03-events] no demo users; skipping");
    return;
  }
  const admins = users.filter((u) => u.role === "admin" || u.role === "owner");
  const activeUsers = users.filter((u) => u.status === "active" && u.role !== "visitor");
  const tags = await prisma.tag.findMany({
    where: { slug: { startsWith: "demo-" } },
    select: { id: true },
  });

  let paidTickets: Array<{ id: string; price: number }> = [];

  for (const def of EVENTS) {
    const creator = pick(admins);
    const eventDate = def.daysOffset >= 0 ? daysAhead(def.daysOffset) : daysAgo(-def.daysOffset);
    const startAt = new Date(eventDate.getTime() + 10 * 60 * 60 * 1000); // 10時スタート
    const endAt = new Date(startAt.getTime() + 3 * 60 * 60 * 1000); // 3時間

    const event = await prisma.event.create({
      data: {
        title: def.title,
        description: def.description,
        locationType: def.locationType,
        venueName: def.locationType !== "online" ? "デモ会場" : null,
        venueAddress: def.locationType !== "online" ? "東京都千代田区サンプル 1-1" : null,
        onlineUrl: def.locationType !== "venue" ? "https://example.com/online-event" : null,
        startAt,
        endAt,
        registrationDeadlineAt:
          def.status === "recruiting" ? daysAhead(Math.max(def.daysOffset - 1, 0)) : null,
        planningRole: "主催",
        eventType: "交流会",
        status: def.status,
        coverImageUrl: `https://picsum.photos/seed/event-${def.title.length}/800/400`,
        createdByUserId: creator.id,
        isAttendeeVisible: def.status !== "draft",
        isCalendarVisible: def.status !== "draft",
        language: "ja",
        accessInfo: def.locationType !== "online" ? "最寄り駅から徒歩 5 分です。" : null,
        participationMethod: "事前申込制",
        contactInfo: "event@test.com",
        cancellationPolicy: "開催 3 日前までのキャンセルは無料。",
      },
      select: { id: true, title: true, createdAt: true, status: true },
    });

    // Tickets
    let ticketPrice = 0;
    if (def.title.includes("プレミアム")) ticketPrice = 5000;
    else if (def.title.includes("講演") || def.title.includes("セミナー")) ticketPrice = 2000;
    else if (def.title.includes("パーティー")) ticketPrice = 3000;

    const ticket = await prisma.eventTicket.create({
      data: {
        eventId: event.id,
        ticketName: ticketPrice > 0 ? "一般参加" : "参加券",
        price: ticketPrice,
        capacity: def.capacity,
        soldCount: def.applicants,
        isActive: def.status === "recruiting" || def.status === "closed",
      },
      select: { id: true, price: true },
    });
    if (ticket.price > 0) paidTickets.push({ id: ticket.id, price: ticket.price });

    // Speakers (for selected events)
    if (
      def.title.includes("講演") ||
      def.title.includes("セミナー") ||
      def.title.includes("ワークショップ")
    ) {
      const speakerCount = randInt(1, 2);
      for (let i = 0; i < speakerCount; i++) {
        const sp = pick(SPEAKER_NAMES);
        await prisma.eventSpeaker.create({
          data: {
            eventId: event.id,
            name: sp.name,
            title: sp.title,
            role: sp.role,
            sortOrder: i,
          },
        });
      }
      // 1 名は社内ユーザー登壇
      if (rand() < 0.5 && activeUsers.length > 0) {
        const user = pick(activeUsers);
        await prisma.eventSpeaker.create({
          data: {
            eventId: event.id,
            userId: user.id,
            name: "（会員登壇）",
            role: "共同講師",
            sortOrder: 2,
          },
        });
      }
    }

    // Organizations
    if (def.title.includes("大型") || def.title.includes("講演") || def.title.includes("創立")) {
      const orgs = pickMany(ORGANIZATIONS, randInt(1, 2));
      for (const [idx, o] of orgs.entries()) {
        await prisma.eventOrganization.create({
          data: { eventId: event.id, organizationName: o.name, role: o.role, sortOrder: idx },
        });
      }
    }

    // Tags
    if (tags.length > 0) {
      const chosenTags = pickMany(tags, randInt(1, 4));
      await prisma.eventTag.createMany({
        data: chosenTags.map((t) => ({ eventId: event.id, tagId: t.id })),
        skipDuplicates: true,
      });
    }

    // Application form config + questions
    if (def.hasApplicationForm) {
      await prisma.eventApplicationFormConfig.create({
        data: {
          eventId: event.id,
          notifyOnCapacityReached: true,
          notifyOnRemainingThreshold: 5,
          completionMessageApp: "お申込みありがとうございました！",
          askName: "required",
          askAffiliation: "optional",
          reminderEnabled: true,
          reminderHoursBefore: 24,
          reminderMessage: "明日イベントです。お気をつけてお越しください。",
        },
      });

      const questions = [
        {
          label: "どのようにこのイベントを知りましたか？",
          type: "radio" as const,
          options: ["SNS", "友人紹介", "ウェブ検索", "その他"],
          required: true,
        },
        { label: "ご要望・質問があればご記入ください", type: "textarea" as const, required: false },
      ];
      const questionIds: string[] = [];
      for (const [qidx, q] of questions.entries()) {
        const created = await prisma.eventApplicationQuestion.create({
          data: {
            eventId: event.id,
            label: q.label,
            questionType: q.type,
            options: "options" in q ? q.options : undefined,
            isRequired: q.required,
            sortOrder: qidx,
          },
          select: { id: true },
        });
        questionIds.push(created.id);
      }
      // Questions の ID は Participant Answers で使う（後述）
      (event as unknown as { _questionIds?: string[] })._questionIds = questionIds;
    }

    // Participants (applicants 人)
    const applicantCount = Math.min(def.applicants, activeUsers.length);
    if (applicantCount > 0) {
      const applicants = pickMany(activeUsers, applicantCount);
      const eventQuestions = def.hasApplicationForm
        ? await prisma.eventApplicationQuestion.findMany({
            where: { eventId: event.id },
            select: { id: true },
          })
        : [];
      for (const user of applicants) {
        let status: "applied" | "confirmed" | "canceled" | "attended" | "no_show" = "confirmed";
        let paymentStatus: "pending" | "paid" | "canceled" | null = null;
        let attendedAt: Date | null = null;
        let canceledAt: Date | null = null;

        if (def.status === "recruiting") {
          status = rand() < 0.7 ? "confirmed" : "applied";
        } else if (def.status === "closed") {
          status = "confirmed";
        } else if (def.status === "ended") {
          const r = rand();
          status = r < 0.7 ? "attended" : r < 0.85 ? "no_show" : "canceled";
          if (status === "attended") attendedAt = event.createdAt;
          if (status === "canceled") canceledAt = daysAgo(randInt(5, 30));
        } else if (def.status === "canceled") {
          status = "canceled";
          canceledAt = daysAgo(randInt(3, 20));
        }

        if (ticket.price > 0) {
          paymentStatus = status === "canceled" ? "canceled" : rand() < 0.9 ? "paid" : "pending";
        }

        try {
          const participant = await prisma.eventParticipant.create({
            data: {
              eventId: event.id,
              userId: user.id,
              ticketId: ticket.id,
              quantity: 1,
              status,
              paymentStatus,
              applicantEmail: user.email,
              applicantName: null,
              appliedAt: daysAgo(randInt(1, 30)),
              canceledAt,
              attendedAt,
            },
            select: { id: true },
          });

          // Answers for each question
          for (const q of eventQuestions) {
            await prisma.eventParticipantAnswer.create({
              data: {
                participantId: participant.id,
                questionId: q.id,
                answer: pick(["SNS", "友人紹介", "ウェブ検索", "質問はありません。"]),
              },
            });
          }
        } catch {
          // unique 制約（同じ event x user x ticket）違反は無視
        }
      }
    }

    // EventResult
    if (def.hasResult) {
      const result = await prisma.eventResult.create({
        data: {
          eventId: event.id,
          attendanceCount: Math.floor(def.applicants * 0.85),
          achievementNotes:
            "予定通り滞りなく開催できました。参加者の満足度も高く、次回への改善点も得られました。",
          summary: "全体として盛況な会となりました。",
          improvementNotes: "会場設備の確認を事前にもう一度行うと良さそうです。",
          executionStatus: def.executionStatus ?? "as_planned",
          status: "completed",
          publishStatus: "public",
          createdByUserId: creator.id,
        },
        select: { id: true },
      });

      // Result attachments (create 1-2 placeholder files)
      for (let i = 0; i < randInt(1, 2); i++) {
        const file = await prisma.file.create({
          data: {
            uploadedByUserId: creator.id,
            originalName: `event-result-${i + 1}.pdf`,
            storageKey: `demo/event-result/${event.id}-${i}.pdf`,
            storageBucket: process.env.R2_BUCKET ?? "demo-local",
            contentType: "application/pdf",
            fileSizeBytes: BigInt(204800),
            fileCategory: "document",
            isPublic: false,
            publicUrl: "https://picsum.photos/seed/event-report/400/500",
          },
          select: { id: true },
        });
        await prisma.eventResultAttachment.create({
          data: { eventResultId: result.id, fileId: file.id, sortOrder: i },
        });
      }
    }

    // Event board (一部のイベントに)
    if (def.status !== "draft" && def.applicants > 5 && rand() < 0.4) {
      const boardCat = await prisma.eventBoardCategory.create({
        data: {
          eventId: event.id,
          name: "イベント内Q&A",
          description: "参加者同士の質問・回答",
          createdByUserId: creator.id,
        },
        select: { id: true },
      });

      const topicCount = randInt(1, 3);
      for (let t = 0; t < topicCount; t++) {
        const author = pick(activeUsers);
        const topic = await prisma.eventBoardTopic.create({
          data: {
            eventId: event.id,
            categoryId: boardCat.id,
            authorUserId: author.id,
            title: pick(BOARD_TOPIC_TITLES),
            body: pick(BOARD_POST_BODIES),
            publishStatus: "published",
            viewCount: randInt(10, 100),
          },
          select: { id: true },
        });
        const postCount = randInt(1, 3);
        for (let p = 0; p < postCount; p++) {
          const post = await prisma.eventBoardTopicPost.create({
            data: {
              topicId: topic.id,
              authorUserId: pick(activeUsers).id,
              body: pick(BOARD_POST_BODIES),
            },
            select: { id: true },
          });
          const commentCount = randInt(0, 3);
          for (let c = 0; c < commentCount; c++) {
            await prisma.eventBoardTopicPostComment.create({
              data: {
                postId: post.id,
                authorUserId: pick(activeUsers).id,
                body: pick(BOARD_COMMENT_BODIES),
              },
            });
          }
        }
      }
    }
  }

  await seedDiscountCodes(prisma, paidTickets);

  console.log(`  [03-events] done (events=${EVENTS.length})`);
}
