// ============================================================
// User & Authentication
// ============================================================

export const UserRole = {
  OWNER: "owner",
  ADMIN: "admin",
  MODERATOR: "moderator",
  MEMBER: "member",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  WITHDRAWN: "withdrawn",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const SocialProvider = {
  GOOGLE: "google",
  APPLE: "apple",
} as const;
export type SocialProvider = (typeof SocialProvider)[keyof typeof SocialProvider];

export const LoginStatus = {
  SUCCESS: "success",
  FAILURE: "failure",
} as const;
export type LoginStatus = (typeof LoginStatus)[keyof typeof LoginStatus];

// ============================================================
// Community Management
// ============================================================

export const FeatureCategory = {
  COMMON: "common",
  OPTIONAL: "optional",
} as const;
export type FeatureCategory = (typeof FeatureCategory)[keyof typeof FeatureCategory];

export const SettingValueType = {
  STRING: "string",
  INTEGER: "integer",
  BOOLEAN: "boolean",
  JSON: "json",
} as const;
export type SettingValueType = (typeof SettingValueType)[keyof typeof SettingValueType];

// ============================================================
// File Management
// ============================================================

export const FileCategory = {
  AVATAR: "avatar",
  IMAGE: "image",
  VIDEO: "video",
  DOCUMENT: "document",
  GENERAL: "general",
} as const;
export type FileCategory = (typeof FileCategory)[keyof typeof FileCategory];

// ============================================================
// Profile
// ============================================================

export const Gender = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
  PREFER_NOT_TO_SAY: "prefer_not_to_say",
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const LanguageProficiency = {
  BEGINNER: "beginner",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
  NATIVE: "native",
} as const;
export type LanguageProficiency =
  (typeof LanguageProficiency)[keyof typeof LanguageProficiency];

// ============================================================
// Cross-cutting
// ============================================================

export const PublishStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;
export type PublishStatus = (typeof PublishStatus)[keyof typeof PublishStatus];

export const SortOrder = {
  ASC: "asc",
  DESC: "desc",
} as const;
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
