import type {
  PrismaClient,
  ReportTargetType,
  ReportCategory,
  ReportStatus,
  ModerationActionType,
  BannedWordMatchType,
  BannedWordAction,
  ScheduleVisibility,
  ScheduleSourceType,
  UserLibraryType,
  UserLibraryStatus,
} from "@prisma/client";
import { pick, pickMany, randInt, rand } from "../helpers/random";
import { daysAgo, daysAhead } from "../helpers/dates";

interface UserSummary {
  id: string;
  email: string;
  role: string;
  status: string;
}

const FAQ_ARTICLES: Array<{ category: string; title: string; body: string }> = [
  {
    category: "会員登録",
    title: "会員登録の方法を教えてください",
    body: "トップページの「新規登録」ボタンからメールアドレスを登録してください。",
  },
  { category: "会員登録", title: "退会したいのですが", body: "設定画面から退会手続きが可能です。" },
  {
    category: "会員登録",
    title: "メールが届きません",
    body: "迷惑メールフォルダをご確認ください。",
  },
  {
    category: "ログイン",
    title: "パスワードを忘れました",
    body: "ログイン画面の「パスワード再設定」をご利用ください。",
  },
  {
    category: "ログイン",
    title: "ログインできません",
    body: "アカウントがロックされていないかご確認ください。",
  },
  {
    category: "支払い",
    title: "支払い方法を教えてください",
    body: "クレジットカード、銀行振込に対応しています。",
  },
  {
    category: "支払い",
    title: "領収書の発行について",
    body: "決済完了後、マイページから発行可能です。",
  },
  {
    category: "イベント",
    title: "イベント申込方法",
    body: "イベント一覧から参加ボタンでお申込みください。",
  },
  {
    category: "イベント",
    title: "キャンセルポリシー",
    body: "イベント開始3日前まで無料キャンセル可能です。",
  },
  {
    category: "イベント",
    title: "イベントが中止になった場合",
    body: "お支払い分は全額返金いたします。",
  },
  { category: "ポイント", title: "ポイントの有効期限", body: "付与日から6か月が基本です。" },
  {
    category: "ポイント",
    title: "ポイントの使い方",
    body: "商品購入時にポイント利用が選択できます。",
  },
  {
    category: "操作",
    title: "プロフィールの編集方法",
    body: "右上のアイコンから「プロフィール編集」をクリック。",
  },
  { category: "操作", title: "通知設定の変更方法", body: "設定画面の「通知」から変更可能です。" },
  { category: "その他", title: "お問合せ先", body: "support@test.com までご連絡ください。" },
];

const BANNED_WORDS: Array<{
  word: string;
  matchType: BannedWordMatchType;
  action: BannedWordAction;
  replacement?: string;
}> = [
  { word: "badword1", matchType: "exact", action: "block" },
  { word: "badword2", matchType: "partial", action: "flag" },
  { word: "badword3", matchType: "exact", action: "replace", replacement: "***" },
  { word: "spam", matchType: "partial", action: "flag" },
  { word: "scam", matchType: "exact", action: "block" },
  { word: "test[0-9]+", matchType: "regex", action: "flag" },
  { word: "禁止単語1", matchType: "exact", action: "block" },
  { word: "禁止単語2", matchType: "partial", action: "replace", replacement: "[削除済]" },
  { word: "violence", matchType: "partial", action: "flag" },
  { word: "hate", matchType: "partial", action: "flag" },
];

async function getDemoUsers(prisma: PrismaClient): Promise<UserSummary[]> {
  return await prisma.user.findMany({
    where: { email: { endsWith: "@test.com" } },
    select: { id: true, email: true, role: true, status: true },
    orderBy: { createdAt: "asc" },
  });
}

async function seedFaq(prisma: PrismaClient): Promise<void> {
  await prisma.faqArticle.createMany({
    data: FAQ_ARTICLES.map((a, idx) => ({
      category: a.category,
      title: a.title,
      body: a.body,
      sortOrder: idx,
      isPublished: idx < 13, // 最後の 2 件は非公開
      viewCount: randInt(10, 500),
    })),
  });
}

async function seedMemos(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const adminOwners = users.filter((u) => u.role === "admin" || u.role === "owner");
  if (adminOwners.length === 0) return;

  const categoryNames = ["仕事関連", "個人メモ", "会議メモ", "アイデア", "TODO"];

  for (const u of adminOwners) {
    const catIds: string[] = [];
    for (const [idx, name] of categoryNames.slice(0, randInt(2, 4)).entries()) {
      const c = await prisma.memoCategory.create({
        data: { userId: u.id, name, sortOrder: idx },
        select: { id: true },
      });
      catIds.push(c.id);
    }

    const memoCount = randInt(3, 8);
    for (let i = 0; i < memoCount; i++) {
      await prisma.memo.create({
        data: {
          userId: u.id,
          categoryId: catIds.length > 0 && rand() < 0.8 ? pick(catIds) : null,
          title: `メモ #${i + 1}`,
          body: "メモの本文です。覚えておきたいことを記録します。",
          createdAt: daysAgo(randInt(1, 60)),
        },
      });
    }
  }
}

async function seedSchedules(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const activeUsers = users.filter((u) => u.status === "active");
  const sourceTypes: Array<ScheduleSourceType | null> = [
    null,
    "event",
    "project_task",
    "skill_booking",
  ];
  const visibilities: ScheduleVisibility[] = ["private", "public"];

  const rows: Array<{
    userId: string;
    sourceType: ScheduleSourceType | null;
    title: string;
    description: string;
    startAt: Date;
    endAt: Date;
    isAllDay: boolean;
    location: string | null;
    visibility: ScheduleVisibility;
  }> = [];

  for (let i = 0; i < 30; i++) {
    const offset = i < 10 ? -randInt(1, 30) : i < 20 ? randInt(1, 30) : 0;
    const start = offset === 0 ? new Date() : offset > 0 ? daysAhead(offset) : daysAgo(-offset);
    rows.push({
      userId: pick(activeUsers).id,
      sourceType: pick(sourceTypes),
      title: `スケジュール ${i + 1}`,
      description: "スケジュールの詳細",
      startAt: start,
      endAt: new Date(start.getTime() + 60 * 60 * 1000),
      isAllDay: rand() < 0.2,
      location: rand() < 0.5 ? "会議室" : null,
      visibility: pick(visibilities),
    });
  }

  await prisma.schedule.createMany({ data: rows });
}

async function seedModeration(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  // BannedWords
  await prisma.bannedWord.createMany({
    data: BANNED_WORDS.map((w) => ({
      word: w.word,
      matchType: w.matchType,
      action: w.action,
      replacement: w.replacement ?? null,
    })),
  });

  // ContentReports + ModerationActions
  const reporters = users.filter((u) => u.status === "active" && u.role !== "visitor");
  const moderators = users.filter((u) => u.role === "admin" || u.role === "owner");
  if (reporters.length === 0 || moderators.length === 0) return;

  const targetTypes: ReportTargetType[] = [
    "board_post",
    "board_comment",
    "chat_message",
    "product",
    "skill_listing",
    "user",
  ];
  const categories: ReportCategory[] = [
    "spam",
    "inappropriate",
    "harassment",
    "copyright",
    "misinformation",
    "other",
  ];
  const statuses: ReportStatus[] = ["pending", "reviewing", "resolved", "dismissed"];
  const actionTypes: ModerationActionType[] = [
    "content_hide",
    "content_delete",
    "user_warn",
    "user_suspend",
    "report_dismiss",
  ];

  for (let i = 0; i < 8; i++) {
    const reporter = pick(reporters);
    const targetType = pick(targetTypes);
    const status = pick(statuses);
    const category = pick(categories);
    const assignedTo = status === "pending" || rand() < 0.3 ? null : pick(moderators);

    const report = await prisma.contentReport.create({
      data: {
        reporterUserId: reporter.id,
        targetType,
        targetId: reporter.id, // dummy target id
        category,
        description: "不適切な内容と判断し通報いたしました。",
        status,
        assignedToUserId: assignedTo?.id ?? null,
        resolvedAt:
          status === "resolved" || status === "dismissed" ? daysAgo(randInt(1, 20)) : null,
      },
      select: { id: true, status: true },
    });

    // ModerationAction for resolved/dismissed reports
    if ((status === "resolved" || status === "dismissed") && rand() < 0.8) {
      const moderator = pick(moderators);
      const actionType = status === "dismissed" ? "report_dismiss" : pick(actionTypes);
      await prisma.moderationAction.create({
        data: {
          reportId: report.id,
          moderatorUserId: moderator.id,
          actionType,
          targetType: String(targetType),
          targetId: reporter.id,
          reason: "通報内容を確認の上、対応いたしました。",
        },
      });
    }
  }
}

async function seedOrientation(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const pages = [
    { title: "ようこそ！", body: "コミュニティへようこそ。" },
    { title: "機能紹介", body: "主な機能をご紹介します。" },
    { title: "ルールと注意事項", body: "コミュニティルールをご確認ください。" },
    { title: "プロフィール設定", body: "プロフィールを充実させましょう。" },
    { title: "最後に", body: "楽しいコミュニティ活動を！" },
  ];
  for (const [idx, p] of pages.entries()) {
    await prisma.orientationPage.create({
      data: { title: p.title, body: p.body, sortOrder: idx, isPublished: true },
    });
  }

  // Completions
  const activeUsers = users.filter((u) => u.status === "active");
  const fullyCompleted = activeUsers.slice(0, Math.floor(activeUsers.length * 0.5));
  for (const u of fullyCompleted) {
    try {
      await prisma.orientationCompletion.create({
        data: { userId: u.id, completedAt: daysAgo(randInt(1, 60)) },
      });
    } catch {
      // unique violation
    }
  }
}

async function seedLibrary(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const types: UserLibraryType[] = ["book", "magazine", "manga", "paper", "document", "other"];
  const statuses: UserLibraryStatus[] = ["unread", "reading", "completed", "want", "lending"];
  const titles = [
    "プログラミング入門",
    "デザインの基礎",
    "マネジメント手法",
    "自己啓発本",
    "漫画シリーズ 第1巻",
    "業界白書 2025",
    "論文: コミュニティ研究",
    "社内資料",
  ];

  const activeUsers = users.filter((u) => u.status === "active");
  for (const u of activeUsers) {
    const count = randInt(0, 5);
    for (let i = 0; i < count; i++) {
      await prisma.userLibraryItem.create({
        data: {
          userId: u.id,
          type: pick(types),
          title: pick(titles),
          author: rand() < 0.7 ? pick(["山田 著", "鈴木 著", "田中 編集", "（複数著者）"]) : null,
          status: pick(statuses),
          impression: rand() < 0.3 ? "おすすめです。" : null,
          pageCount: randInt(50, 500),
        },
      });
    }
  }
}

export async function seedMisc(prisma: PrismaClient): Promise<void> {
  const users = await getDemoUsers(prisma);
  if (users.length === 0) {
    console.log("  [08-misc] no demo users; skipping");
    return;
  }

  console.log("  [08-misc] FAQ articles");
  await seedFaq(prisma);

  console.log("  [08-misc] memo categories and memos");
  await seedMemos(prisma, users);

  console.log("  [08-misc] schedules");
  await seedSchedules(prisma, users);

  console.log("  [08-misc] moderation (banned words / reports / actions)");
  await seedModeration(prisma, users);

  console.log("  [08-misc] orientation (pages / completions)");
  await seedOrientation(prisma, users);

  console.log("  [08-misc] user library");
  await seedLibrary(prisma, users);

  console.log("  [08-misc] done");
}
