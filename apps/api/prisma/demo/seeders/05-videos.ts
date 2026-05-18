import type { PrismaClient } from "@prisma/client";
import { pick, pickMany, randInt, rand } from "../helpers/random";
import { daysAgo, hoursAgo } from "../helpers/dates";

interface UserSummary {
  id: string;
  email: string;
  role: string;
  status: string;
}

const VIDEO_SERIES = [
  { name: "新人研修シリーズ", description: "新メンバー向けの基本解説。", videoCount: 6 },
  { name: "月例講座アーカイブ", description: "月例講座の録画アーカイブ。", videoCount: 5 },
  { name: "ゲスト講師特別回", description: "ゲスト講師による特別講座。", videoCount: 2 },
];

const STANDALONE_VIDEOS = [
  { title: "コミュニティ利用ガイド", duration: 480 },
  { title: "運営からのご挨拶", duration: 300 },
];

const ACTIVITY_ACTIONS = [
  "login",
  "view_board_topic",
  "create_board_topic",
  "create_board_comment",
  "view_event",
  "apply_event",
  "view_video",
  "watch_video",
  "complete_video",
  "earn_points",
  "view_chat",
  "send_chat_message",
  "update_profile",
];

async function getDemoUsers(prisma: PrismaClient): Promise<UserSummary[]> {
  return await prisma.user.findMany({
    where: { email: { endsWith: "@test.com" } },
    select: { id: true, email: true, role: true, status: true },
    orderBy: { createdAt: "asc" },
  });
}

async function seedVideoModels(prisma: PrismaClient, users: UserSummary[]): Promise<string[]> {
  const activeUsers = users.filter((u) => u.status === "active");
  const admin = users.find((u) => u.role === "admin");
  if (!admin) return [];

  // Series
  const seriesIds: string[] = [];
  for (const [idx, def] of VIDEO_SERIES.entries()) {
    const s = await prisma.videoSeries.create({
      data: { name: def.name, description: def.description, sortOrder: idx },
      select: { id: true },
    });
    seriesIds.push(s.id);
  }

  const videoIds: string[] = [];
  let videoIdx = 0;

  // Series videos
  for (const [sIdx, def] of VIDEO_SERIES.entries()) {
    for (let v = 0; v < def.videoCount; v++) {
      const isDraft = videoIdx === 12;
      const isProcessing = videoIdx === 3;
      const video = await prisma.video.create({
        data: {
          seriesId: seriesIds[sIdx]!,
          createdByUserId: admin.id,
          title: `${def.name} 第${v + 1}回`,
          description: `${def.name} 第${v + 1}回の動画です。内容は講義形式になっています。`,
          videoProvider: "cloudflare_stream",
          videoExternalId: `demo-${videoIdx}`,
          playbackUrl: `https://example.com/stream/demo-${videoIdx}/manifest.m3u8`,
          streamStatus: isProcessing ? "processing" : "ready",
          thumbnailUrl: `https://picsum.photos/seed/video-${videoIdx}/640/360`,
          durationSeconds: randInt(300, 3600),
          publishStatus: isDraft ? "draft" : "published",
          watchOrder: v,
          sortOrder: videoIdx,
          viewCount: isDraft ? 0 : randInt(20, 400),
        },
        select: { id: true },
      });
      videoIds.push(video.id);

      // Instructors (1-2)
      const instructorCount = randInt(1, 2);
      for (let i = 0; i < instructorCount; i++) {
        const useUser = rand() < 0.3;
        await prisma.videoInstructor.create({
          data: {
            videoId: video.id,
            userId: useUser ? pick(activeUsers).id : null,
            name: useUser
              ? "（会員講師）"
              : `外部講師 ${pick(["山田", "鈴木", "田中", "佐藤", "高橋"])}`,
            affiliation: "株式会社サンプル",
            sortOrder: i,
          },
        });
      }

      videoIdx++;
    }
  }

  // Standalone videos
  for (const def of STANDALONE_VIDEOS) {
    const video = await prisma.video.create({
      data: {
        createdByUserId: admin.id,
        title: def.title,
        description: "単発動画",
        videoProvider: "cloudflare_stream",
        videoExternalId: `demo-standalone-${videoIdx}`,
        playbackUrl: `https://example.com/stream/demo-${videoIdx}/manifest.m3u8`,
        streamStatus: "ready",
        thumbnailUrl: `https://picsum.photos/seed/video-${videoIdx}/640/360`,
        durationSeconds: def.duration,
        publishStatus: "published",
        sortOrder: videoIdx,
        viewCount: randInt(50, 300),
      },
      select: { id: true },
    });
    videoIds.push(video.id);
    videoIdx++;
  }

  return videoIds;
}

async function seedWatchProgress(
  prisma: PrismaClient,
  videoIds: string[],
  users: UserSummary[],
): Promise<void> {
  const activeUsers = users.filter((u) => u.status === "active");
  const rows: Array<{
    videoId: string;
    userId: string;
    watchedSeconds: number;
    totalSeconds: number;
    isCompleted: boolean;
    lastPositionSeconds: number;
    completedAt: Date | null;
    lastWatchedAt: Date;
  }> = [];
  const seen = new Set<string>();

  for (const u of activeUsers) {
    const watchCount = randInt(0, Math.min(8, videoIds.length));
    const userVideos = pickMany(videoIds, watchCount);
    for (const videoId of userVideos) {
      const key = `${videoId}:${u.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const totalSeconds = randInt(300, 3600);
      const r = rand();
      let watched = 0;
      let isCompleted = false;
      if (r < 0.15) watched = Math.floor(totalSeconds * 0.02);
      else if (r < 0.55) watched = Math.floor(totalSeconds * (0.3 + rand() * 0.4));
      else if (r < 0.8) watched = Math.floor(totalSeconds * (0.9 + rand() * 0.09));
      else {
        watched = totalSeconds;
        isCompleted = true;
      }

      rows.push({
        videoId,
        userId: u.id,
        watchedSeconds: watched,
        totalSeconds,
        isCompleted,
        lastPositionSeconds: watched,
        completedAt: isCompleted ? daysAgo(randInt(1, 30)) : null,
        lastWatchedAt: daysAgo(randInt(0, 30)),
      });
    }
  }

  if (rows.length > 0) {
    await prisma.videoWatchProgress.createMany({ data: rows });
  }
}

async function seedVideoTasks(
  prisma: PrismaClient,
  videoIds: string[],
  users: UserSummary[],
): Promise<void> {
  const activeUsers = users.filter((u) => u.status === "active");
  const targetVideos = videoIds.slice(0, 5);

  for (const [vIdx, videoId] of targetVideos.entries()) {
    const task = await prisma.videoTask.create({
      data: {
        videoId,
        title: `第${vIdx + 1}回ワーク`,
        description: "動画視聴後の課題です。視聴後の感想をご記入ください。",
        sortOrder: 0,
      },
      select: { id: true },
    });

    const completers = pickMany(activeUsers, randInt(3, 8));
    for (const u of completers) {
      const r = rand();
      const status: "not_started" | "in_progress" | "completed" =
        r < 0.3 ? "in_progress" : "completed";
      try {
        await prisma.videoTaskCompletion.create({
          data: {
            videoTaskId: task.id,
            userId: u.id,
            status,
            completedAt: status === "completed" ? daysAgo(randInt(1, 30)) : null,
          },
        });
      } catch {
        // unique violations
      }
    }
  }
}

async function seedActivityLogs(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const rows: Array<{
    userId: string;
    action: string;
    resourceType: string | null;
    createdAt: Date;
  }> = [];

  for (const u of users) {
    if (u.status === "withdrawn") continue;
    const count =
      u.role === "admin" || u.role === "owner"
        ? randInt(80, 150)
        : u.status === "suspended"
          ? randInt(5, 20)
          : u.role === "visitor"
            ? randInt(3, 10)
            : randInt(30, 80);

    for (let i = 0; i < count; i++) {
      const action = pick(ACTIVITY_ACTIONS);
      rows.push({
        userId: u.id,
        action,
        resourceType: action.includes("video")
          ? "video"
          : action.includes("board")
            ? "board_topic"
            : action.includes("event")
              ? "event"
              : null,
        createdAt: daysAgo(randInt(0, 60)),
      });
    }
  }

  // Chunked insert
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.activityLog.createMany({ data: rows.slice(i, i + CHUNK) });
  }
}

async function seedEngagementScores(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const calcAt = hoursAgo(6);
  for (const u of users) {
    if (u.status === "withdrawn") continue;
    let score: number;
    if (u.role === "admin" || u.role === "owner") score = 85 + randInt(0, 15);
    else if (u.status === "suspended") score = randInt(5, 20);
    else if (u.role === "visitor") score = randInt(10, 25);
    else score = randInt(40, 90);

    await prisma.engagementScore.create({
      data: {
        userId: u.id,
        score,
        loginFrequencyScore: Math.max(0, score - randInt(0, 20)),
        postFrequencyScore: Math.max(0, score - randInt(0, 25)),
        eventParticipationScore: Math.max(0, score - randInt(0, 30)),
        videoWatchScore: Math.max(0, score - randInt(0, 20)),
        calculatedAt: calcAt,
      },
    });
  }
}

async function seedAnalyticsSnapshots(prisma: PrismaClient): Promise<void> {
  const rows: Array<{
    snapshotDate: Date;
    totalMembers: number;
    activeMembers: number;
    newMembers: number;
    withdrawnMembers: number;
    totalPosts: number;
    totalComments: number;
    totalEvents: number;
    totalEventParticipants: number;
    totalVideoViews: number;
    totalOrders: number;
    totalRevenue: number;
  }> = [];

  for (let i = 30; i >= 1; i--) {
    const d = daysAgo(i);
    // Normalize date to midnight (Prisma @db.Date strips time anyway)
    rows.push({
      snapshotDate: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      totalMembers: 20 + Math.floor(i / 3),
      activeMembers: 15 + Math.floor(i / 4),
      newMembers: i % 7 === 0 ? randInt(1, 3) : 0,
      withdrawnMembers: i % 14 === 0 ? 1 : 0,
      totalPosts: randInt(3, 20),
      totalComments: randInt(5, 40),
      totalEvents: randInt(0, 2),
      totalEventParticipants: randInt(0, 30),
      totalVideoViews: randInt(10, 100),
      totalOrders: randInt(0, 5),
      totalRevenue: randInt(0, 50000),
    });
  }

  try {
    await prisma.analyticsSnapshot.createMany({ data: rows, skipDuplicates: true });
  } catch {
    // unique date conflicts ignored
  }
}

async function seedMemberActivitySummary(
  prisma: PrismaClient,
  users: UserSummary[],
): Promise<void> {
  const calcAt = hoursAgo(6);
  for (const u of users) {
    if (u.status === "withdrawn") continue;
    const base =
      u.role === "admin" || u.role === "owner"
        ? 60
        : u.status === "suspended"
          ? 5
          : u.role === "visitor"
            ? 3
            : 30;
    await prisma.memberActivitySummary.create({
      data: {
        userId: u.id,
        lastLoginAt: daysAgo(randInt(0, 14)),
        loginCount: base + randInt(0, base),
        postCount: randInt(0, 20),
        commentCount: randInt(0, 50),
        eventParticipationCount: randInt(0, 10),
        lastEventParticipatedAt: daysAgo(randInt(5, 60)),
        videoWatchCount: randInt(0, 15),
        chatMessageCount: randInt(0, 30),
        projectCount: randInt(0, 3),
        calculatedAt: calcAt,
      },
    });
  }
}

export async function seedVideos(prisma: PrismaClient): Promise<void> {
  const users = await getDemoUsers(prisma);
  if (users.length === 0) {
    console.log("  [05-videos] no demo users; skipping");
    return;
  }

  console.log("  [05-videos] videos / series / instructors");
  const videoIds = await seedVideoModels(prisma, users);

  console.log("  [05-videos] watch progress");
  await seedWatchProgress(prisma, videoIds, users);

  console.log("  [05-videos] video tasks / completions");
  await seedVideoTasks(prisma, videoIds, users);

  console.log("  [05-videos] activity logs");
  await seedActivityLogs(prisma, users);

  console.log("  [05-videos] engagement scores");
  await seedEngagementScores(prisma, users);

  console.log("  [05-videos] analytics snapshots");
  await seedAnalyticsSnapshots(prisma);

  console.log("  [05-videos] member activity summaries");
  await seedMemberActivitySummary(prisma, users);

  console.log(`  [05-videos] done (videos=${videoIds.length})`);
}
