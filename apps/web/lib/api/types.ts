export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface FeatureSetting {
  featureKey: string;
  featureName: string;
  category: "common" | "optional";
  isEnabled: boolean;
  description: string | null;
  sortOrder: number;
}

// --- App Settings ---

export interface AppSetting {
  id: string;
  key: string;
  value: string;
  valueType: "string" | "integer" | "boolean" | "json";
  description: string | null;
}

export interface UpdateAppSettingInput {
  value: string;
}

export interface ToggleFeatureInput {
  isEnabled: boolean;
}

// --- Permissions ---

export interface PermissionSetting {
  id: string;
  featureKey: string;
  action: string;
  allowedRoles: string[];
  requiredRankId: string | null;
  featureSetting: {
    featureName: string;
    category: "common" | "optional";
  };
  requiredRank: {
    name: string;
    slug: string;
  } | null;
}

export interface CreatePermissionInput {
  featureKey: string;
  action: string;
  allowedRoles: string[];
  requiredRankId?: string;
}

export interface UpdatePermissionInput {
  allowedRoles?: string[];
  requiredRankId?: string | null;
}

// --- Pagination ---

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// --- Users ---

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface UserProfile {
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  birthday: string | null;
  website: string | null;
  nameKana: string | null;
  gender: string | null;
  occupation: string | null;
  countryOfOrigin: string | null;
  allowDirectMessages: boolean;
  headerImageUrl: string | null;
}

export interface UserPublicInfo {
  nickname: string | null;
  nicknameKana: string | null;
  specialty: string | null;
  prefecture: string | null;
  city: string | null;
  foreignCountry: string | null;
  foreignCity: string | null;
  introduction: string | null;
  eventRole: string | null;
  publicStatus: "public" | "private";
}

export interface UserInterestItem {
  id: string;
  categoryId: string;
  categoryName?: string;
}

export interface UserLanguageItem {
  id: string;
  languageCode: string;
  proficiency: string | null;
  sortOrder: number;
}

export interface UserAffiliationItem {
  id: string;
  organizationName: string;
  title: string | null;
  roleDescription: string | null;
  sortOrder: number;
}

export interface UserDetail extends UserListItem {
  profile: UserProfile | null;
  publicInfo: UserPublicInfo | null;
  interests: UserInterestItem[];
  languages: UserLanguageItem[];
  affiliations: UserAffiliationItem[];
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface UpdateProfileInput {
  bio?: string;
  phone?: string;
  birthday?: string;
  website?: string;
  nameKana?: string;
  gender?: string;
  occupation?: string;
  countryOfOrigin?: string;
  allowDirectMessages?: boolean;
  avatarUrl?: string;
  headerImageUrl?: string;
}

export interface UpdatePublicInfoInput {
  nickname?: string;
  nicknameKana?: string;
  specialty?: string;
  prefecture?: string;
  city?: string;
  foreignCountry?: string;
  foreignCity?: string;
  introduction?: string;
  eventRole?: string;
  publicStatus?: "public" | "private";
}
