import type { PrismaClient, ProjectStatus, PublishStatus, VideoTaskStatus } from "@prisma/client";
import { pick, pickMany, randInt, rand } from "../helpers/random";
import { daysAgo, daysAhead } from "../helpers/dates";
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

interface ProjectDef {
  name: string;
  description: string;
  status: ProjectStatus;
  publishStatus: PublishStatus;
  memberCount: number;
  threadCount: number;
  taskCount: number;
}

const PROJECTS: ProjectDef[] = [
  {
    name: "新機能開発プロジェクト",
    description: "コミュニティ新機能の企画・検討・実装を進めるプロジェクト。",
    status: "in_progress",
    publishStatus: "published",
    memberCount: 7,
    threadCount: 8,
    taskCount: 12,
  },
  {
    name: "春イベント企画チーム",
    description: "春のコミュニティ大型イベントを企画運営するチーム。",
    status: "in_progress",
    publishStatus: "published",
    memberCount: 6,
    threadCount: 6,
    taskCount: 10,
  },
  {
    name: "読書サークル",
    description: "月1回の読書会を運営するサークル。",
    status: "in_progress",
    publishStatus: "published",
    memberCount: 5,
    threadCount: 3,
    taskCount: 4,
  },
  {
    name: "年末パーティー準備",
    description: "2025年末パーティーの準備。実施済み。",
    status: "completed",
    publishStatus: "published",
    memberCount: 8,
    threadCount: 5,
    taskCount: 8,
  },
  {
    name: "旧サイトリニューアル",
    description: "過去に実施したサイトリニューアル。記録として保持。",
    status: "completed",
    publishStatus: "unpublished",
    memberCount: 4,
    threadCount: 2,
    taskCount: 3,
  },
];

const TASK_TITLES = [
  "要件定義のドキュメント化",
  "デザインのレビュー",
  "API 仕様の策定",
  "フロントエンド実装",
  "バックエンド実装",
  "テストケース作成",
  "ドキュメント更新",
  "ステージング環境での動作確認",
  "広報用素材の準備",
  "外部連携先との調整",
  "キックオフ会議",
  "定例ミーティング設定",
  "予算見積もり",
  "成果報告書作成",
];

const TAGS_FOR_PROJECTS = ["demo-tech", "demo-event", "demo-important", "demo-new"];

async function getDemoUsers(prisma: PrismaClient): Promise<UserSummary[]> {
  return await prisma.user.findMany({
    where: { email: { endsWith: "@test.com" } },
    select: { id: true, email: true, role: true, status: true },
    orderBy: { createdAt: "asc" },
  });
}

function generateInviteToken(projectIndex: number): string {
  return `demo-invite-${projectIndex}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function seedProjects(prisma: PrismaClient): Promise<void> {
  const users = await getDemoUsers(prisma);
  if (users.length === 0) {
    console.log("  [04-projects] no demo users; skipping");
    return;
  }
  const admins = users.filter((u) => u.role === "admin" || u.role === "owner");
  const activeUsers = users.filter((u) => u.status === "active" && u.role !== "visitor");
  if (admins.length === 0 || activeUsers.length === 0) return;

  const tags = await prisma.tag.findMany({
    where: { slug: { in: TAGS_FOR_PROJECTS } },
    select: { id: true, slug: true },
  });

  for (const [pIdx, def] of PROJECTS.entries()) {
    const creator = pick(admins);
    const startDate =
      def.status === "completed" ? daysAgo(randInt(120, 250)) : daysAgo(randInt(15, 60));
    const endDate =
      def.status === "completed" ? daysAgo(randInt(30, 90)) : daysAhead(randInt(30, 120));

    const project = await prisma.project.create({
      data: {
        name: def.name,
        description: def.description,
        status: def.status,
        publishStatus: def.publishStatus,
        inviteToken: generateInviteToken(pIdx),
        inviteLinkEnabled: def.publishStatus === "published",
        startDate,
        endDate,
        createdByUserId: creator.id,
        coverImageUrl: `https://picsum.photos/seed/project-${pIdx}/800/300`,
      },
      select: { id: true },
    });

    // Members
    const memberPool = pickMany(activeUsers, Math.min(def.memberCount, activeUsers.length));
    for (const [idx, u] of memberPool.entries()) {
      let status: "active" | "withdrawn" | "removed" = "active";
      if (idx > 0 && rand() < 0.1) status = pick(["withdrawn", "removed"] as const);
      try {
        await prisma.projectMember.create({
          data: {
            projectId: project.id,
            userId: u.id,
            role: idx === 0 ? "admin" : "member",
            status,
            joinedAt: daysAgo(randInt(10, 60)),
            removedAt: status !== "active" ? daysAgo(randInt(1, 30)) : null,
            removedReason: status === "removed" ? "活動停止のため" : null,
          },
        });
      } catch {
        // unique 制約違反は無視
      }
    }

    // Tags
    if (tags.length > 0) {
      const chosen = pickMany(tags, randInt(1, Math.min(3, tags.length)));
      await prisma.projectTag.createMany({
        data: chosen.map((t) => ({ projectId: project.id, tagId: t.id })),
        skipDuplicates: true,
      });
    }

    // Threads + Replies + Likes
    const threadIds: string[] = [];
    const replyIds: string[] = [];
    for (let t = 0; t < def.threadCount; t++) {
      const threadAuthor = pick(memberPool);
      const lastReplyAt = daysAgo(randInt(1, 30));
      const thread = await prisma.projectThread.create({
        data: {
          projectId: project.id,
          title: pick(BOARD_TOPIC_TITLES),
          createdByUserId: threadAuthor.id,
          isPinned: t === 0,
          lastReplyAt,
        },
        select: { id: true },
      });
      threadIds.push(thread.id);

      const replyCount = randInt(2, 8);
      for (let r = 0; r < replyCount; r++) {
        const reply = await prisma.projectThreadReply.create({
          data: {
            threadId: thread.id,
            authorUserId: pick(memberPool).id,
            body: pick(BOARD_POST_BODIES),
          },
          select: { id: true },
        });
        replyIds.push(reply.id);
      }

      await prisma.projectThread.update({
        where: { id: thread.id },
        data: { replyCount },
      });
    }

    // Likes on threads and replies
    const likeRows: Array<{
      userId: string;
      threadId: string | null;
      replyId: string | null;
    }> = [];
    const seenKeys = new Set<string>();
    for (const threadId of threadIds) {
      const likers = pickMany(memberPool, randInt(0, Math.min(3, memberPool.length)));
      for (const liker of likers) {
        const key = `${liker.id}:t:${threadId}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        likeRows.push({ userId: liker.id, threadId, replyId: null });
      }
    }
    for (const replyId of pickMany(replyIds, Math.min(replyIds.length, 10))) {
      const likers = pickMany(memberPool, randInt(0, Math.min(2, memberPool.length)));
      for (const liker of likers) {
        const key = `${liker.id}:r:${replyId}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        likeRows.push({ userId: liker.id, threadId: null, replyId });
      }
    }
    if (likeRows.length > 0) {
      await prisma.projectThreadLike.createMany({ data: likeRows });
    }

    // Tasks
    const taskStatuses: VideoTaskStatus[] = ["not_started", "in_progress", "completed"];
    for (let ti = 0; ti < def.taskCount; ti++) {
      const task = await prisma.projectTask.create({
        data: {
          projectId: project.id,
          title: pick(TASK_TITLES),
          description: "タスク詳細は必要に応じて追記します。",
          status: def.status === "completed" ? "completed" : pick(taskStatuses),
          requestedDate: daysAgo(randInt(1, 30)),
          dueDate: def.status === "completed" ? daysAgo(randInt(1, 60)) : daysAhead(randInt(1, 30)),
          sortOrder: ti,
          createdByUserId: creator.id,
        },
        select: { id: true },
      });

      // Assignees
      const assigneeCount = randInt(1, Math.min(3, memberPool.length));
      const assignees = pickMany(memberPool, assigneeCount);
      for (const a of assignees) {
        try {
          await prisma.projectTaskAssignee.create({
            data: { taskId: task.id, userId: a.id },
          });
        } catch {
          // ignore unique
        }
      }
    }

    // Schedules
    const scheduleCount = randInt(2, 5);
    for (let si = 0; si < scheduleCount; si++) {
      const startAt = si < scheduleCount / 2 ? daysAhead(randInt(1, 30)) : daysAgo(randInt(1, 30));
      await prisma.projectSchedule.create({
        data: {
          projectId: project.id,
          title: `定例ミーティング #${si + 1}`,
          description: "プロジェクト定例",
          startAt,
          endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
          isAllDay: false,
          location: rand() < 0.5 ? "オンライン" : "会議室",
          createdByUserId: creator.id,
        },
      });
    }

    // Board (for active projects only, minimal)
    if (def.status === "in_progress" && def.threadCount >= 5) {
      const boardCat = await prisma.projectBoardCategory.create({
        data: {
          projectId: project.id,
          name: "議事録",
          description: "ミーティング議事録の共有",
          createdByUserId: creator.id,
        },
        select: { id: true },
      });
      const topicCount = randInt(1, 3);
      for (let ti = 0; ti < topicCount; ti++) {
        const topic = await prisma.projectBoardTopic.create({
          data: {
            projectId: project.id,
            categoryId: boardCat.id,
            authorUserId: pick(memberPool).id,
            title: pick(BOARD_TOPIC_TITLES),
            body: pick(BOARD_POST_BODIES),
            publishStatus: "published",
          },
          select: { id: true },
        });
        const postCount = randInt(1, 2);
        for (let pi = 0; pi < postCount; pi++) {
          const post = await prisma.projectBoardTopicPost.create({
            data: {
              topicId: topic.id,
              authorUserId: pick(memberPool).id,
              body: pick(BOARD_POST_BODIES),
            },
            select: { id: true },
          });
          const commentCount = randInt(0, 3);
          for (let ci = 0; ci < commentCount; ci++) {
            await prisma.projectBoardTopicPostComment.create({
              data: {
                postId: post.id,
                authorUserId: pick(memberPool).id,
                body: pick(BOARD_COMMENT_BODIES),
              },
            });
          }
        }
      }
    }

    // Update project stats
    await prisma.project.update({
      where: { id: project.id },
      data: {
        memberCount: def.memberCount,
        activityCount: def.threadCount + def.taskCount,
      },
    });
  }

  console.log(`  [04-projects] done (projects=${PROJECTS.length})`);
}
