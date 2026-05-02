import type { Prisma } from "@prisma/client";

/**
 * 検索結果として表示してよいレコードのフィルタ条件を集約。
 *
 * 各ドメインの search service から参照される共通定義。論理削除済み・下書き・
 * 非公開ユーザー等を除外する条件を一元管理することで、ドメインごとの
 * フィルタ漏れを防ぐ。
 *
 * 各ドメインの `where` 句に以下のように展開して使う:
 *
 * ```ts
 * await this.prisma.event.findMany({
 *   where: { ...VISIBILITY.event, ... 他の絞り込み },
 * });
 * ```
 */
export const VISIBILITY = {
  boardTopic: {
    deletedAt: null,
    publishStatus: "published",
  } satisfies Prisma.BoardTopicWhereInput,

  product: {
    deletedAt: null,
    publishStatus: "published",
  } satisfies Prisma.ProductWhereInput,

  event: {
    deletedAt: null,
    NOT: { status: "draft" },
  } satisfies Prisma.EventWhereInput,

  video: {
    deletedAt: null,
    publishStatus: "published",
  } satisfies Prisma.VideoWhereInput,

  project: {
    deletedAt: null,
    publishStatus: "published",
  } satisfies Prisma.ProjectWhereInput,

  user: {
    deletedAt: null,
    status: "active",
    publicInfo: { is: { publicStatus: "public" } },
  } satisfies Prisma.UserWhereInput,

  survey: {
    deletedAt: null,
    NOT: { status: "draft" },
  } satisfies Prisma.SurveyWhereInput,

  skillListing: {
    deletedAt: null,
    status: "active",
  } satisfies Prisma.SkillListingWhereInput,

  album: {
    deletedAt: null,
    publishStatus: "published",
  } satisfies Prisma.AlbumWhereInput,

  venue: {
    deletedAt: null,
    publishStatus: "published",
  } satisfies Prisma.VenueWhereInput,

  content: {
    deletedAt: null,
    publishStatus: "published",
  } satisfies Prisma.ContentWhereInput,

  faqArticle: {
    isPublished: true,
  } satisfies Prisma.FaqArticleWhereInput,
} as const;
