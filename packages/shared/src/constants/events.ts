// ============================================================
// Events: enums
// ============================================================
//
// Prisma schema 側の enum と文字列値が一致するように維持する。
// バック・フロント両方で参照され、フロントでは zod の .enum() 引数や
// react-hook-form の defaultValue 構築に使う。

export const EventStatus = {
  DRAFT: "draft",
  RECRUITING: "recruiting",
  CLOSED: "closed",
  CANCELED: "canceled",
  ENDED: "ended",
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];
export const EVENT_STATUS_VALUES = Object.values(EventStatus) as readonly EventStatus[];

export const EventLocationType = {
  VENUE: "venue",
  ONLINE: "online",
  HYBRID: "hybrid",
} as const;
export type EventLocationType = (typeof EventLocationType)[keyof typeof EventLocationType];
export const EVENT_LOCATION_TYPE_VALUES = Object.values(
  EventLocationType,
) as readonly EventLocationType[];

export const EventOrganizationRole = {
  ORGANIZER: "organizer",
  CO_ORGANIZER: "co_organizer",
  COOPERATION: "cooperation",
  SPONSOR: "sponsor",
  SUPPORT: "support",
} as const;
export type EventOrganizationRole =
  (typeof EventOrganizationRole)[keyof typeof EventOrganizationRole];
export const EVENT_ORGANIZATION_ROLE_VALUES = Object.values(
  EventOrganizationRole,
) as readonly EventOrganizationRole[];

export const EventSpeakerRole = {
  SPEAKER: "speaker",
  CO_SPEAKER: "co_speaker",
  GUEST: "guest",
  MODERATOR: "moderator",
  PANELIST: "panelist",
} as const;
export type EventSpeakerRole = (typeof EventSpeakerRole)[keyof typeof EventSpeakerRole];
export const EVENT_SPEAKER_ROLE_VALUES = Object.values(
  EventSpeakerRole,
) as readonly EventSpeakerRole[];

// ============================================================
// Events: input limits
// ============================================================
//
// イベント編集フォーム / API DTO で参照する上限値。
// バック (class-validator の @ArrayMaxSize / @MaxLength) と
// フロント (zod の .max / useFieldArray の length チェック) で同じ値を参照する。

/** 1 イベントに付けられるタグの最大数 */
export const MAX_EVENT_TAGS = 3;

/** 1 イベントに登録できる登壇者の最大数 */
export const MAX_EVENT_SPEAKERS = 5;

/** 1 イベントに登録できる関係団体の最大数 */
export const MAX_EVENT_ORGANIZATIONS = 20;

/** タグ名の最大文字数 */
export const MAX_EVENT_TAG_LENGTH = 50;

/** イベントタイトルの最大文字数 */
export const MAX_EVENT_TITLE_LENGTH = 200;

/** 関係団体名の最大文字数 */
export const MAX_ORGANIZATION_NAME_LENGTH = 200;

/** 登壇者名の最大文字数 */
export const MAX_SPEAKER_NAME_LENGTH = 100;

/** 登壇者の肩書の最大文字数 */
export const MAX_SPEAKER_TITLE_LENGTH = 100;
