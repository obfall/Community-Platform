import type { PrismaClient } from "@prisma/client";
import { pick, pickMany, randInt, rand } from "../helpers/random";
import { daysAgo, daysAhead, hoursAgo } from "../helpers/dates";
import {
  BOARD_TOPIC_TITLES,
  BOARD_POST_BODIES,
  BOARD_COMMENT_BODIES,
  CHAT_MESSAGE_BODIES,
  NOTIFICATION_TITLES,
} from "../fixtures/text-samples";

const NOTIFICATION_TYPES = [
  "board_post_new",
  "board_comment",
  "board_like",
  "event_invite",
  "system_notice",
  "rank_up",
];

interface UserSummary {
  id: string;
  email: string;
  role: string;
  status: string;
}

async function getDemoUsers(prisma: PrismaClient): Promise<UserSummary[]> {
  return await prisma.user.findMany({
    where: { email: { endsWith: "@test.com" } },
    select: { id: true, email: true, role: true, status: true },
    orderBy: { createdAt: "asc" },
  });
}

async function seedNotificationPreferences(
  prisma: PrismaClient,
  users: UserSummary[],
): Promise<void> {
  const data: Array<{
    userId: string;
    notificationType: string;
    emailEnabled: boolean;
    inAppEnabled: boolean;
    lineEnabled: boolean;
  }> = [];

  users.forEach((u, idx) => {
    const allOff = idx < 2 && u.role === "member"; // 2 名は全OFF
    const partialOff = idx >= 2 && idx < 7 && u.role === "member"; // 5 名はメールOFF

    for (const type of NOTIFICATION_TYPES) {
      data.push({
        userId: u.id,
        notificationType: type,
        emailEnabled: allOff ? false : partialOff ? rand() < 0.5 : true,
        inAppEnabled: !allOff,
        lineEnabled: allOff ? false : rand() < 0.2,
      });
    }
  });

  await prisma.notificationPreference.createMany({ data });
}

async function seedBoard(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const activeUsers = users.filter((u) => u.status === "active");
  const admins = activeUsers.filter((u) => u.role === "admin" || u.role === "owner");

  const categories = await prisma.boardCategory.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
  if (categories.length === 0) return;

  const announceCat = categories.find((c) => c.name === "お知らせ") ?? categories[0]!;

  type TopicPattern =
    | "pinned"
    | "draft"
    | "published_no_comments"
    | "published_few_comments"
    | "published_many_comments"
    | "published_nested";

  const patterns: TopicPattern[] = [
    ...Array<TopicPattern>(3).fill("pinned"),
    ...Array<TopicPattern>(2).fill("draft"),
    ...Array<TopicPattern>(5).fill("published_no_comments"),
    ...Array<TopicPattern>(15).fill("published_few_comments"),
    ...Array<TopicPattern>(11).fill("published_many_comments"),
    ...Array<TopicPattern>(4).fill("published_nested"),
  ];

  const topicIdsForLikes: string[] = [];
  const postIdsForLikes: string[] = [];
  const commentIdsForLikes: string[] = [];

  for (const [i, pattern] of patterns.entries()) {
    const isPinned = pattern === "pinned";
    const isDraft = pattern === "draft";
    const category = isPinned ? announceCat : pick(categories);
    const author = isPinned ? pick(admins.length ? admins : activeUsers) : pick(activeUsers);
    const title = BOARD_TOPIC_TITLES[i % BOARD_TOPIC_TITLES.length]!;
    const createdAt = daysAgo(randInt(1, 45));

    const topic = await prisma.boardTopic.create({
      data: {
        categoryId: category.id,
        authorUserId: author.id,
        title: isPinned ? `【重要】${title}` : title,
        body: pick(BOARD_POST_BODIES),
        publishStatus: isDraft ? "draft" : "published",
        isPinned,
        sortOrder: isPinned ? -(i + 1) : 0,
        viewCount: isDraft ? 0 : randInt(5, 500),
        createdAt,
        updatedAt: createdAt,
      },
      select: { id: true },
    });
    topicIdsForLikes.push(topic.id);

    if (isDraft) continue;

    const postCount =
      pattern === "published_no_comments"
        ? 0
        : pattern === "published_few_comments"
          ? randInt(1, 3)
          : pattern === "published_many_comments"
            ? randInt(8, 12)
            : randInt(3, 6);

    let topicPostCount = 0;
    for (let p = 0; p < postCount; p++) {
      const postAuthor = pick(activeUsers);
      const postCreatedAt = new Date(
        createdAt.getTime() + (p + 1) * 60 * 60 * 1000 + randInt(0, 86400) * 1000,
      );
      const post = await prisma.boardTopicPost.create({
        data: {
          topicId: topic.id,
          authorUserId: postAuthor.id,
          body: pick(BOARD_POST_BODIES),
          createdAt: postCreatedAt,
          updatedAt: postCreatedAt,
        },
        select: { id: true },
      });
      postIdsForLikes.push(post.id);
      topicPostCount++;

      const commentCount =
        pattern === "published_many_comments"
          ? randInt(3, 8)
          : pattern === "published_nested"
            ? randInt(2, 5)
            : randInt(0, 2);

      const topLevelCommentIds: string[] = [];
      let postCommentCount = 0;
      for (let c = 0; c < commentCount; c++) {
        const commentAuthor = pick(activeUsers);
        const commentCreatedAt = new Date(
          postCreatedAt.getTime() + (c + 1) * 30 * 60 * 1000 + randInt(0, 3600) * 1000,
        );
        const comment = await prisma.boardTopicPostComment.create({
          data: {
            postId: post.id,
            authorUserId: commentAuthor.id,
            body: pick(BOARD_COMMENT_BODIES),
            createdAt: commentCreatedAt,
            updatedAt: commentCreatedAt,
          },
          select: { id: true },
        });
        topLevelCommentIds.push(comment.id);
        commentIdsForLikes.push(comment.id);
        postCommentCount++;
      }

      // ネスト返信（published_nested のみ）
      if (pattern === "published_nested" && topLevelCommentIds.length > 0) {
        const replyTargets = pickMany(topLevelCommentIds, Math.min(2, topLevelCommentIds.length));
        for (const parentId of replyTargets) {
          const reply1 = await prisma.boardTopicPostComment.create({
            data: {
              postId: post.id,
              authorUserId: pick(activeUsers).id,
              parentCommentId: parentId,
              body: pick(BOARD_COMMENT_BODIES),
              createdAt: daysAgo(randInt(1, 20)),
            },
            select: { id: true },
          });
          commentIdsForLikes.push(reply1.id);
          postCommentCount++;

          // 深さ3
          if (rand() < 0.5) {
            const reply2 = await prisma.boardTopicPostComment.create({
              data: {
                postId: post.id,
                authorUserId: pick(activeUsers).id,
                parentCommentId: reply1.id,
                body: pick(BOARD_COMMENT_BODIES),
                createdAt: daysAgo(randInt(1, 15)),
              },
              select: { id: true },
            });
            commentIdsForLikes.push(reply2.id);
            postCommentCount++;
          }
        }
      }

      await prisma.boardTopicPost.update({
        where: { id: post.id },
        data: { commentCount: postCommentCount },
      });
    }

    await prisma.boardTopic.update({
      where: { id: topic.id },
      data: { postCount: topicPostCount },
    });
  }

  // BoardLike (polymorphic)
  const likeRows: Array<{
    userId: string;
    targetType: string;
    targetId: string;
  }> = [];
  const seen = new Set<string>();

  const addLike = (userId: string, targetType: string, targetId: string) => {
    const key = `${userId}:${targetType}:${targetId}`;
    if (seen.has(key)) return;
    seen.add(key);
    likeRows.push({ userId, targetType, targetId });
  };

  for (const postId of postIdsForLikes) {
    const likerCount = randInt(0, 6);
    const likers = pickMany(activeUsers, likerCount);
    for (const liker of likers) addLike(liker.id, "post", postId);
  }
  for (const commentId of pickMany(commentIdsForLikes, Math.min(50, commentIdsForLikes.length))) {
    const likerCount = randInt(0, 4);
    const likers = pickMany(activeUsers, likerCount);
    for (const liker of likers) addLike(liker.id, "comment", commentId);
  }

  if (likeRows.length > 0) {
    await prisma.boardLike.createMany({ data: likeRows });
  }
}

async function seedChat(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const activeMembers = users.filter(
    (u) => u.status === "active" && (u.role === "member" || u.role === "owner"),
  );
  const admin = users.find((u) => u.role === "admin");
  if (activeMembers.length < 4 || !admin) return;

  // 1:1 DM × 6
  for (let i = 0; i < 6; i++) {
    const [u1, u2] = pickMany(activeMembers, 2);
    if (!u1 || !u2) continue;
    const room = await prisma.chatRoom.create({
      data: {
        type: "dm",
        createdByUserId: u1.id,
        lastMessageAt: daysAgo(randInt(0, 7)),
      },
      select: { id: true },
    });
    await prisma.chatRoomMember.createMany({
      data: [
        {
          chatRoomId: room.id,
          userId: u1.id,
          role: "member",
          lastReadAt: hoursAgo(randInt(1, 48)),
        },
        {
          chatRoomId: room.id,
          userId: u2.id,
          role: "member",
          lastReadAt: hoursAgo(randInt(1, 96)),
        },
      ],
    });
    await seedChatMessages(prisma, room.id, [u1, u2], randInt(15, 40));
  }

  // 小グループ × 2
  for (let i = 0; i < 2; i++) {
    const members = pickMany(activeMembers, randInt(3, 5));
    const creator = members[0]!;
    const room = await prisma.chatRoom.create({
      data: {
        type: "group",
        name: i === 0 ? "運営チーム" : "イベント企画メンバー",
        description: "内部連絡用",
        createdByUserId: creator.id,
        lastMessageAt: daysAgo(randInt(0, 5)),
      },
      select: { id: true },
    });
    await prisma.chatRoomMember.createMany({
      data: members.map((m, idx) => ({
        chatRoomId: room.id,
        userId: m.id,
        role: (idx === 0 ? "admin" : "member") as "admin" | "member",
        lastReadAt: hoursAgo(randInt(1, 48)),
      })),
    });
    await seedChatMessages(prisma, room.id, members, randInt(20, 40));
  }

  // 大グループ × 1
  {
    const members = pickMany(activeMembers, Math.min(12, activeMembers.length));
    const creator = members[0]!;
    const room = await prisma.chatRoom.create({
      data: {
        type: "group",
        name: "大型イベント委員会",
        description: "大規模イベントの企画・運営メンバー",
        createdByUserId: creator.id,
        lastMessageAt: daysAgo(randInt(0, 3)),
      },
      select: { id: true },
    });
    await prisma.chatRoomMember.createMany({
      data: members.map((m, idx) => ({
        chatRoomId: room.id,
        userId: m.id,
        role: (idx === 0 ? "admin" : "member") as "admin" | "member",
        lastReadAt: hoursAgo(randInt(1, 72)),
      })),
    });
    await seedChatMessages(prisma, room.id, members, randInt(30, 50));
  }

  // 全体ルーム × 1
  {
    const everyone = [admin, ...activeMembers];
    const room = await prisma.chatRoom.create({
      data: {
        type: "group",
        name: "全体連絡",
        description: "コミュニティ全員が参加する連絡用ルーム",
        createdByUserId: admin.id,
        lastMessageAt: daysAgo(randInt(0, 2)),
      },
      select: { id: true },
    });
    await prisma.chatRoomMember.createMany({
      data: everyone.map((m) => ({
        chatRoomId: room.id,
        userId: m.id,
        role: (m.id === admin.id ? "admin" : "member") as "admin" | "member",
        lastReadAt: hoursAgo(randInt(1, 96)),
      })),
    });
    await seedChatMessages(prisma, room.id, everyone, randInt(25, 40));
  }
}

async function seedChatMessages(
  prisma: PrismaClient,
  roomId: string,
  participants: UserSummary[],
  count: number,
): Promise<void> {
  const rows: Array<{
    chatRoomId: string;
    senderUserId: string;
    messageType: "text";
    body: string;
    createdAt: Date;
  }> = [];

  const spanHours = randInt(48, 240); // 2〜10 日間
  for (let i = 0; i < count; i++) {
    const sender = pick(participants);
    const hoursBack = spanHours * (1 - i / count);
    rows.push({
      chatRoomId: roomId,
      senderUserId: sender.id,
      messageType: "text",
      body: pick(CHAT_MESSAGE_BODIES),
      createdAt: hoursAgo(hoursBack),
    });
  }

  await prisma.chatMessage.createMany({ data: rows });
}

async function seedBroadcasts(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const admins = users.filter((u) => u.role === "admin" || u.role === "owner");
  if (admins.length === 0) return;

  const activeUsers = users.filter((u) => u.status === "active");
  const templates = await prisma.broadcastTemplate.findMany({ select: { id: true, name: true } });
  const generalTemplate = templates.find((t) => t.name === "一般配信");

  interface BroadcastDef {
    subject: string;
    body: string;
    status: "draft" | "scheduled" | "sending" | "sent" | "failed";
    channels: Array<"email" | "in_app" | "line">;
    useTemplate: boolean;
  }

  const defs: BroadcastDef[] = [
    {
      subject: "【下書き】新機能のご案内",
      body: "まだ編集中です。",
      status: "draft",
      channels: ["email"],
      useTemplate: false,
    },
    {
      subject: "【下書き】次回イベントのお知らせ",
      body: "イベント詳細を記載予定。",
      status: "draft",
      channels: ["email", "in_app"],
      useTemplate: true,
    },
    {
      subject: "【予約配信】年末キャンペーン",
      body: "年末キャンペーン配信予定。",
      status: "scheduled",
      channels: ["email"],
      useTemplate: true,
    },
    {
      subject: "【予約配信】リマインダー",
      body: "イベントリマインダーです。",
      status: "scheduled",
      channels: ["email", "in_app"],
      useTemplate: true,
    },
    {
      subject: "【配信中】緊急メンテナンス連絡",
      body: "現在配信中の緊急メンテナンス案内。",
      status: "sending",
      channels: ["email", "in_app"],
      useTemplate: false,
    },
    {
      subject: "【配信完了】システム更新のお知らせ",
      body: "システム更新のお知らせです。",
      status: "sent",
      channels: ["email"],
      useTemplate: false,
    },
    {
      subject: "【配信完了】新年のご挨拶",
      body: "本年もよろしくお願いします。",
      status: "sent",
      channels: ["email", "in_app"],
      useTemplate: false,
    },
    {
      subject: "【配信完了】週次レポート",
      body: "今週のコミュニティ活動まとめ。",
      status: "sent",
      channels: ["email"],
      useTemplate: true,
    },
    {
      subject: "【配信完了】月例会のお知らせ",
      body: "月例会の詳細をお知らせします。",
      status: "sent",
      channels: ["email", "in_app"],
      useTemplate: true,
    },
    {
      subject: "【配信失敗】プロモーション配信",
      body: "一部受信者への配信に失敗しました。",
      status: "failed",
      channels: ["email"],
      useTemplate: false,
    },
  ];

  const createdBroadcasts: Array<{ id: string; status: string }> = [];

  for (const def of defs) {
    const creator = pick(admins);
    const createdAt = daysAgo(randInt(1, 60));
    const scheduledAt =
      def.status === "scheduled" ? daysAhead(randInt(3, 20)) : def.status === "draft" ? null : null;
    const sentAt =
      def.status === "sent" || def.status === "sending" ? daysAgo(randInt(0, 30)) : null;

    const totalRecipients = activeUsers.length;
    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;
    if (def.status === "sent") {
      sentCount = totalRecipients;
      deliveredCount = Math.floor(totalRecipients * 0.95);
      failedCount = totalRecipients - deliveredCount;
    } else if (def.status === "sending") {
      sentCount = Math.floor(totalRecipients * 0.4);
      deliveredCount = Math.floor(sentCount * 0.9);
    } else if (def.status === "failed") {
      sentCount = Math.floor(totalRecipients * 0.3);
      failedCount = totalRecipients - sentCount;
    }

    const b = await prisma.broadcast.create({
      data: {
        subject: def.subject,
        bodyHtml: `<p>${def.body}</p>`,
        bodyText: def.body,
        scope: "global",
        channels: def.channels,
        targetType: "all",
        templateId: def.useTemplate && generalTemplate ? generalTemplate.id : null,
        status: def.status,
        scheduledAt,
        sentAt,
        totalRecipients,
        sentCount,
        deliveredCount,
        failedCount,
        createdByUserId: creator.id,
        createdAt,
        updatedAt: createdAt,
      },
      select: { id: true, status: true },
    });
    createdBroadcasts.push(b);

    // BroadcastRecipient 生成
    if (def.status !== "draft") {
      const recipientRows = activeUsers.map((u, idx) => {
        let status: "pending" | "sent" | "delivered" | "bounced" | "opened" | "clicked" | "failed" =
          "pending";
        if (def.status === "sent") {
          const r = rand();
          status = r < 0.5 ? "delivered" : r < 0.75 ? "opened" : r < 0.9 ? "clicked" : "bounced";
        } else if (def.status === "sending") {
          status = idx < sentCount ? "sent" : "pending";
        } else if (def.status === "failed") {
          status = idx < sentCount ? "failed" : "pending";
        } else if (def.status === "scheduled") {
          status = "pending";
        }
        return {
          broadcastId: b.id,
          userId: u.id,
          channel: "email" as const,
          email: u.email,
          status,
          sentAt:
            status === "sent" ||
            status === "delivered" ||
            status === "opened" ||
            status === "clicked"
              ? (sentAt ?? createdAt)
              : null,
          openedAt: status === "opened" || status === "clicked" ? (sentAt ?? createdAt) : null,
          clickedAt: status === "clicked" ? (sentAt ?? createdAt) : null,
        };
      });
      await prisma.broadcastRecipient.createMany({ data: recipientRows });
    }
  }

  // BroadcastAttachment（2 つの sent broadcast に添付）
  const sentBroadcasts = createdBroadcasts.filter((b) => b.status === "sent").slice(0, 2);
  if (sentBroadcasts.length > 0) {
    // 添付用ファイルを作成
    const admin = admins[0]!;
    for (const b of sentBroadcasts) {
      const file = await prisma.file.create({
        data: {
          uploadedByUserId: admin.id,
          originalName: "broadcast-attachment.pdf",
          storageKey: `demo/broadcast/${b.id}.pdf`,
          storageBucket: process.env.R2_BUCKET ?? "demo-local",
          contentType: "application/pdf",
          fileSizeBytes: BigInt(102400),
          fileCategory: "document",
          isPublic: false,
          publicUrl: "https://picsum.photos/seed/broadcast-doc/400/500",
        },
        select: { id: true },
      });
      await prisma.broadcastAttachment.create({
        data: { broadcastId: b.id, fileId: file.id, sortOrder: 0 },
      });
    }
  }

  // BroadcastSuppression (3 件)
  const withdrawnUser = users.find((u) => u.status === "withdrawn");
  const suppressEmails: Array<{ email: string; reason: "bounce" | "unsubscribe" | "manual" }> = [
    { email: activeUsers[activeUsers.length - 1]!.email, reason: "bounce" },
    { email: activeUsers[activeUsers.length - 2]!.email, reason: "unsubscribe" },
  ];
  if (withdrawnUser) suppressEmails.push({ email: withdrawnUser.email, reason: "manual" });
  await prisma.broadcastSuppression.createMany({ data: suppressEmails });
}

async function seedNotifications(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const rows: Array<{
    userId: string;
    type: string;
    title: string;
    body: string | null;
    referenceType: string | null;
    referenceId: string | null;
    actorUserId: string | null;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
  }> = [];

  const activeUsers = users.filter((u) => u.status === "active");

  for (const u of users) {
    if (u.status === "withdrawn") continue;

    const count = u.role === "admin" || u.role === "owner" ? randInt(20, 40) : randInt(10, 30);

    for (let i = 0; i < count; i++) {
      const type = pick(NOTIFICATION_TYPES);
      const titles = NOTIFICATION_TITLES[type] ?? [`通知: ${type}`];
      const createdAt = daysAgo(randInt(0, 45));
      const actor =
        type === "system_notice" || type === "rank_up"
          ? null
          : pick(activeUsers.filter((x) => x.id !== u.id));

      const readProbability =
        type === "rank_up"
          ? 0
          : type === "event_invite"
            ? 0
            : type === "board_post_new"
              ? 0.7
              : type === "board_comment"
                ? 0.5
                : type === "board_like"
                  ? 0.3
                  : type === "system_notice"
                    ? 0.6
                    : 0.5;

      const isRead = rand() < readProbability;

      rows.push({
        userId: u.id,
        type,
        title: pick(titles),
        body: null,
        referenceType: null,
        referenceId: null,
        actorUserId: actor?.id ?? null,
        isRead,
        readAt: isRead ? new Date(createdAt.getTime() + randInt(60, 86400) * 1000) : null,
        createdAt,
      });
    }
  }

  // chunked insert
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.notification.createMany({ data: rows.slice(i, i + CHUNK) });
  }
}

export async function seedCommunication(prisma: PrismaClient): Promise<void> {
  const users = await getDemoUsers(prisma);
  if (users.length === 0) {
    console.log("  [02-communication] no demo users; skipping");
    return;
  }

  console.log("  [02-communication] notification preferences");
  await seedNotificationPreferences(prisma, users);

  console.log("  [02-communication] board topics / posts / comments / likes");
  await seedBoard(prisma, users);

  console.log("  [02-communication] chat rooms / messages");
  await seedChat(prisma, users);

  console.log("  [02-communication] broadcasts / recipients / attachments / suppressions");
  await seedBroadcasts(prisma, users);

  console.log("  [02-communication] notifications");
  await seedNotifications(prisma, users);

  console.log("  [02-communication] done");
}
