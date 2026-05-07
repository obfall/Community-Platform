// Types
export type {
  ApiResponse,
  ApiErrorResponse,
  PaginationQuery,
  PaginationMeta,
  PaginatedResponse,
} from "./types";

// Constants & Enums
export {
  APP_NAME,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  UserRole,
  UserStatus,
  SocialProvider,
  LoginStatus,
  FeatureCategory,
  SettingValueType,
  FileCategory,
  Gender,
  LanguageProficiency,
  PublishStatus,
  SortOrder,
  ErrorCode,
} from "./constants";

// i18n
export {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  INITIAL_SUPPORTED_LOCALES,
  LOCALE_CODE_PATTERN,
  isValidLocaleCode,
  pickLocalized,
} from "./i18n";
export type { Locale, LocalizedText, LocaleAware } from "./i18n";
