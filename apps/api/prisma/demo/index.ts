import type { PrismaClient } from "@prisma/client";
import { seedFoundation } from "./seeders/01-foundation";
import { seedCommunication } from "./seeders/02-communication";
import { seedEvents } from "./seeders/03-events";
import { seedProjects } from "./seeders/04-projects";
import { seedVideos } from "./seeders/05-videos";
import { seedEngagement } from "./seeders/06-engagement";
import { seedCommerce } from "./seeders/07-commerce";
import { seedMisc } from "./seeders/08-misc";
import { seedE2EUsers } from "./seeders/09-e2e-users";
import { setSeed } from "./helpers/random";

const DEMO_EMAIL_SUFFIX = "@test.com";
const userFilter = { user: { email: { endsWith: DEMO_EMAIL_SUFFIX } } };

// 全デモデータを reverse-dependency 順に削除する。
// インフラ（MemberRank / FeatureSetting / AppSetting / BroadcastTemplate /
// MemberAttribute / PermissionSetting）は seed.ts の管理下なので touch しない。
async function truncateDemoData(prisma: PrismaClient): Promise<void> {
  console.log("  [truncate] commerce / misc");
  // Orders cascade to items. Products cascade to images.
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.productSeries.deleteMany({});
  await prisma.shopSetting.deleteMany({});

  // Albums cascade to photos/tags
  await prisma.album.deleteMany({});

  // Reservations + spaces + venues (venue cascade to spaces/images)
  await prisma.reservation.deleteMany({});
  await prisma.venue.deleteMany({});

  // Contents
  await prisma.content.deleteMany({});

  // Memos
  await prisma.memo.deleteMany({});
  await prisma.memoCategory.deleteMany({});

  // Schedules
  await prisma.schedule.deleteMany({});

  // Moderation
  await prisma.moderationAction.deleteMany({});
  await prisma.contentReport.deleteMany({});
  await prisma.bannedWord.deleteMany({});

  // Orientation
  await prisma.orientationCompletion.deleteMany({});
  await prisma.orientationPage.deleteMany({});

  // FAQ
  await prisma.faqArticle.deleteMany({});

  // Library
  await prisma.userLibraryItem.deleteMany({});

  console.log("  [truncate] content / engagement");
  // Video: cascade to instructors/attachments/progress/tasks/completions
  await prisma.video.deleteMany({});
  await prisma.videoSeries.deleteMany({});

  // Skills
  await prisma.skillMessage.deleteMany({
    where: { sender: { email: { endsWith: DEMO_EMAIL_SUFFIX } } },
  });
  await prisma.skillBooking.deleteMany({
    where: { requester: { email: { endsWith: DEMO_EMAIL_SUFFIX } } },
  });
  await prisma.skillComment.deleteMany({
    where: { author: { email: { endsWith: DEMO_EMAIL_SUFFIX } } },
  });
  await prisma.skillListing.deleteMany({
    where: { provider: { email: { endsWith: DEMO_EMAIL_SUFFIX } } },
  });

  // Surveys
  await prisma.surveyResponse.deleteMany({
    where: { survey: { createdBy: { email: { endsWith: DEMO_EMAIL_SUFFIX } } } },
  });
  await prisma.survey.deleteMany({
    where: { createdBy: { email: { endsWith: DEMO_EMAIL_SUFFIX } } },
  });

  // Points
  await prisma.pointHistory.deleteMany({ where: userFilter });
  await prisma.pointSummary.deleteMany({ where: userFilter });
  await prisma.pointRule.deleteMany({});

  // Analytics
  await prisma.activityLog.deleteMany({ where: userFilter });
  await prisma.engagementScore.deleteMany({ where: userFilter });
  await prisma.memberActivitySummary.deleteMany({ where: userFilter });
  await prisma.analyticsSnapshot.deleteMany({});

  console.log("  [truncate] events / projects");
  await prisma.event.deleteMany({
    where: { createdByUser: { email: { endsWith: DEMO_EMAIL_SUFFIX } } },
  });
  await prisma.project.deleteMany({
    where: { createdByUser: { email: { endsWith: DEMO_EMAIL_SUFFIX } } },
  });
  await prisma.eventBoardLike.deleteMany({ where: userFilter });
  await prisma.projectBoardLike.deleteMany({ where: userFilter });
  await prisma.projectThreadLike.deleteMany({ where: userFilter });

  console.log("  [truncate] communication");
  await prisma.boardLike.deleteMany({ where: userFilter });
  await prisma.boardTopic.deleteMany({
    where: { author: { email: { endsWith: DEMO_EMAIL_SUFFIX } } },
  });
  await prisma.chatMessage.deleteMany({
    where: { sender: { email: { endsWith: DEMO_EMAIL_SUFFIX } } },
  });
  await prisma.chatRoomMember.deleteMany({ where: userFilter });
  await prisma.chatRoom.deleteMany({
    where: { createdByUser: { email: { endsWith: DEMO_EMAIL_SUFFIX } } },
  });
  await prisma.broadcastAttachment.deleteMany({
    where: { broadcast: { createdByUser: { email: { endsWith: DEMO_EMAIL_SUFFIX } } } },
  });
  await prisma.broadcastRecipient.deleteMany({
    where: { broadcast: { createdByUser: { email: { endsWith: DEMO_EMAIL_SUFFIX } } } },
  });
  await prisma.broadcast.deleteMany({
    where: { createdByUser: { email: { endsWith: DEMO_EMAIL_SUFFIX } } },
  });
  await prisma.broadcastSuppression.deleteMany({
    where: { email: { endsWith: DEMO_EMAIL_SUFFIX } },
  });
  await prisma.notification.deleteMany({ where: userFilter });
  await prisma.notificationPreference.deleteMany({ where: userFilter });

  console.log("  [truncate] foundation");
  await prisma.boardCategory.deleteMany({
    where: { createdByUser: { email: { endsWith: DEMO_EMAIL_SUFFIX } } },
  });
  await prisma.file.deleteMany({
    where: { uploadedByUser: { email: { endsWith: DEMO_EMAIL_SUFFIX } } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: DEMO_EMAIL_SUFFIX } } });
  await prisma.category.deleteMany({ where: { scope: "user_interest" } });
  await prisma.tag.deleteMany({ where: { slug: { startsWith: "demo-" } } });
}

export async function runDemoSeed(prisma: PrismaClient): Promise<void> {
  setSeed(0x13371337);

  console.log("Demo seed: start");
  await truncateDemoData(prisma);

  await seedFoundation(prisma);
  console.log("  [09-e2e-users] e2e専用ユーザー");
  await seedE2EUsers(prisma);
  await seedCommunication(prisma);
  await seedEvents(prisma);
  await seedProjects(prisma);
  await seedVideos(prisma);
  await seedEngagement(prisma);
  await seedCommerce(prisma);
  await seedMisc(prisma);

  console.log("Demo seed: complete");
}
