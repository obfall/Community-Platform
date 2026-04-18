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
  sortBy?: "role" | "name" | "createdAt";
  sortOrder?: "asc" | "desc";
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

// --- Board ---

export interface BoardCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  allowTopicCreation: boolean;
  topicCount: number;
  createdAt: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  sortOrder?: number;
  allowTopicCreation?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  allowTopicCreation?: boolean;
}

export interface BoardPostAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface LikeResponse {
  liked: boolean;
  likeCount: number;
}

// --- Board Topics ---

export interface BoardTopic {
  id: string;
  title: string;
  body: string;
  publishStatus: string;
  isPinned: boolean;
  sortOrder: number;
  viewCount: number;
  postCount: number;
  likeCount: number;
  author: BoardPostAuthor;
  category: { id: string; name: string };
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoardTopicPost {
  id: string;
  body: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  author: BoardPostAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface BoardTopicPostComment {
  id: string;
  body: string;
  likeCount: number;
  isLiked: boolean;
  author: BoardPostAuthor;
  childComments?: BoardTopicPostComment[];
  createdAt: string;
  updatedAt: string;
}

export interface TopicListQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
}

export interface CreateTopicInput {
  title: string;
  body: string;
  categoryId: string;
  publishStatus?: "draft" | "published";
}

export interface UpdateTopicInput {
  title?: string;
  body?: string;
  categoryId?: string;
  publishStatus?: "draft" | "published";
}

export interface CreateTopicPostInput {
  body: string;
}

export interface CreateTopicPostCommentInput {
  body: string;
  parentCommentId?: string;
}

export interface ReorderInput {
  items: { id: string; sortOrder: number }[];
}

// --- Notifications ---

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  actor: BoardPostAuthor | null;
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface UnreadCount {
  count: number;
}

export interface NotificationPreference {
  id: string;
  notificationType: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  lineEnabled: boolean;
}

export interface PreferenceItem {
  notificationType: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  lineEnabled: boolean;
}

export interface UpdatePreferencesInput {
  preferences: PreferenceItem[];
}

// --- Chat ---

export interface ChatRoomMember {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

export interface ChatLastMessage {
  id: string;
  body: string | null;
  messageType: string;
  senderName: string;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  type: "dm" | "group";
  name: string | null;
  description: string | null;
  iconUrl: string | null;
  maxMembers: number | null;
  lastMessageAt: string | null;
  memberCount: number;
  unreadCount: number;
  lastMessage: ChatLastMessage | null;
  members: ChatRoomMember[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  messageType: string;
  body: string | null;
  fileId: string | null;
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  readCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatRoomInput {
  type: "dm" | "group";
  name?: string;
  description?: string;
  memberIds: string[];
}

export interface UpdateChatRoomInput {
  name?: string;
  description?: string;
}

// --- Mail ---

export interface MailMessage {
  id: string;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  targetType: string;
  targetFilter: Record<string, unknown> | null;
  templateId: string | null;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  scheduledAt: string | null;
  sentAt: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface MailMessageRecipient {
  id: string;
  userId: string;
  email: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
}

export interface MailMessageDetail extends MailMessage {
  recipients: MailMessageRecipient[];
}

export interface CreateMailMessageInput {
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  targetType: string;
  targetFilter?: Record<string, unknown>;
  templateId?: string;
  scheduledAt?: string;
}

export interface UpdateMailMessageInput {
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  targetType?: string;
  targetFilter?: Record<string, unknown>;
  templateId?: string;
  scheduledAt?: string;
}

export interface MailTemplate {
  id: string;
  name: string;
  category: string;
  subjectTemplate: string;
  bodyHtmlTemplate: string;
  bodyTextTemplate: string | null;
  availableVariables: string[] | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMailTemplateInput {
  name: string;
  category: "event" | "general";
  subjectTemplate: string;
  bodyHtmlTemplate: string;
  bodyTextTemplate?: string;
  availableVariables?: string[];
}

export interface UpdateMailTemplateInput {
  name?: string;
  category?: "event" | "general";
  subjectTemplate?: string;
  bodyHtmlTemplate?: string;
  bodyTextTemplate?: string;
  availableVariables?: string[];
}

export interface MailSuppression {
  id: string;
  email: string;
  reason: string;
  createdAt: string;
}

export interface CreateMailSuppressionInput {
  email: string;
  reason: "unsubscribe" | "bounce" | "complaint" | "manual";
}

export interface MailMessageQuery {
  page?: number;
  limit?: number;
  status?: string;
}

// --- Member Attributes ---

export interface MemberAttribute {
  id: string;
  name: string;
  slug: string;
  type: "text" | "number" | "date" | "select" | "multi_select";
  options: string[] | null;
  isRequired: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserAttributeValue {
  attributeId: string;
  attributeName: string;
  slug: string;
  type: string;
  options: string[] | null;
  isRequired: boolean;
  value: string | null;
}

export interface CreateMemberAttributeInput {
  name: string;
  slug: string;
  type: "text" | "number" | "date" | "select" | "multi_select";
  options?: string[];
  isRequired?: boolean;
  sortOrder?: number;
}

export interface UpdateMemberAttributeInput {
  name?: string;
  options?: string[];
  isRequired?: boolean;
}

export interface SetAttributeValueItem {
  attributeId: string;
  value: string | null;
}

export interface UserEventItem {
  id: string;
  title: string;
  status: string;
  startAt: string;
  endAt: string;
  locationType: string;
  venueName: string | null;
  coverImageUrl: string | null;
  category: { id: string; name: string } | null;
  participantStatus: string;
  appliedAt: string;
}

export interface UserProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  coverImageUrl: string | null;
  category: { id: string; name: string } | null;
  memberCount: number;
  memberRole: string;
  joinedAt: string;
}

export interface MyTicketItem {
  id: string;
  event: {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    status: string;
    venueName: string | null;
    locationType: string;
  };
  ticket: {
    id: string;
    ticketName: string;
    price: number;
    currency: string;
  } | null;
  quantity: number;
  status: string;
  paymentStatus: string | null;
  appliedAt: string;
}

export interface MyReservationItem {
  id: string;
  title: string | null;
  startAt: string;
  endAt: string;
  status: string;
  note: string | null;
  createdAt: string;
  space: {
    id: string;
    name: string;
    venue: { id: string; name: string };
  };
}

export interface MyTaskItem {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  dueDate: string | null;
  requestedDate: string | null;
  project: { id: string; name: string };
}

export interface LibraryItem {
  id: string;
  type: "book" | "magazine" | "manga" | "paper" | "document" | "other";
  title: string;
  content: string | null;
  author: string | null;
  publishedAt: string | null;
  pageCount: number | null;
  impression: string | null;
  status: "unread" | "reading" | "completed" | "want" | "lending";
  fileId: string | null;
  file: { id: string; originalName: string; publicUrl: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLibraryItemInput {
  type: LibraryItem["type"];
  title: string;
  content?: string;
  author?: string;
  publishedAt?: string;
  pageCount?: number;
  impression?: string;
  status?: LibraryItem["status"];
  fileId?: string;
}

export type UpdateLibraryItemInput = Partial<CreateLibraryItemInput>;

// --- Events ---

export interface EventListItem {
  id: string;
  title: string;
  description: string | null;
  locationType: string;
  venueId: string | null;
  venueName: string | null;
  startAt: string;
  endAt: string;
  status: string;
  coverImageUrl: string | null;
  participantCount: number;
  category: { id: string; name: string } | null;
  createdBy: { id: string; name: string; avatarUrl: string | null };
  ticketCount: number;
  totalCapacity: number | null;
  minPrice: number | null;
  createdAt: string;
}

export interface EventTicket {
  id: string;
  ticketName: string;
  price: number;
  currency: string;
  capacity: number | null;
  purchaseLimit: number;
  sortOrder: number;
  isActive: boolean;
  soldCount: number;
}

export interface EventSpeaker {
  id: string;
  name: string;
  title: string | null;
  role: string;
  sortOrder: number;
  user: { id: string; name: string; avatarUrl: string | null } | null;
}

export interface EventOrganization {
  id: string;
  organizationName: string;
  role: string;
  sortOrder: number;
}

export interface EventDetail extends EventListItem {
  venueId: string | null;
  venueAddress: string | null;
  onlineUrl: string | null;
  registrationDeadlineAt: string | null;
  ticketSaleStartAt: string | null;
  allowMultiTicketPurchase: boolean;
  planningRole: string;
  eventType: string | null;
  accessInfo: string | null;
  participationMethod: string | null;
  contactInfo: string | null;
  cancellationPolicy: string | null;
  language: string | null;
  isAttendeeVisible: boolean;
  isCalendarVisible: boolean;
  requiredRank: { id: string; name: string } | null;
  tickets: EventTicket[];
  speakers: EventSpeaker[];
  organizations: EventOrganization[];
  tags: { id: string; name: string; slug: string }[];
  updatedAt: string;
}

export interface EventParticipant {
  id: string;
  user: { id: string; name: string; avatarUrl: string | null };
  ticket: { id: string; ticketName: string; price: number } | null;
  quantity: number;
  status: string;
  paymentStatus: string | null;
  paymentMethod: string | null;
  appliedAt: string;
  canceledAt: string | null;
  attendedAt: string | null;
}

export interface EventParticipantDetail {
  id: string;
  user: { id: string; name: string; avatarUrl: string | null };
  ticket: { id: string; ticketName: string; price: number } | null;
  quantity: number;
  status: string;
  applicantEmail: string;
  applicantName: string | null;
  applicantNameKana: string | null;
  applicantAffiliation: string | null;
  applicantGender: string | null;
  applicantAge: number | null;
  applicantOccupation: string | null;
  applicantNationality: string | null;
  appliedAt: string;
  canceledAt: string | null;
  answers: Array<{
    questionId: string;
    label: string;
    questionType: string;
    answer: string | string[];
  }>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  locationType: string;
  status: string;
  coverImageUrl: string | null;
}

export interface EventQuery {
  page?: number;
  limit?: number;
  status?: string;
  categoryId?: string;
  eventType?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  locationType: "venue" | "online" | "hybrid";
  venueId?: string;
  venueName?: string;
  venueAddress?: string;
  onlineUrl?: string;
  startAt: string;
  endAt: string;
  registrationDeadlineAt?: string;
  ticketSaleStartAt?: string;
  allowMultiTicketPurchase?: boolean;
  planningRole?: string;
  eventType?: string;
  categoryId?: string;
  accessInfo?: string;
  participationMethod?: string;
  contactInfo?: string;
  cancellationPolicy?: string;
  isAttendeeVisible?: boolean;
  coverImageUrl?: string;
  requiredRankId?: string;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: string;
  isCalendarVisible?: boolean;
}

export interface CreateTicketInput {
  ticketName: string;
  price?: number;
  currency?: string;
  capacity?: number;
  purchaseLimit?: number;
  isActive?: boolean;
}

export interface ParticipateEventInput {
  ticketId: string;
  quantity?: number;
  discountCode?: string;
  paymentMethod?: string;
  applicantEmail: string;
  applicantName?: string;
  applicantNameKana?: string;
  applicantAffiliation?: string;
  applicantGender?: string;
  applicantAge?: number;
  applicantOccupation?: string;
  applicantNationality?: string;
  answers?: Array<{ questionId: string; answer: string | string[] }>;
}

// --- Application Form ---

export type FormFieldVisibility = "hidden" | "optional" | "required";

export type ApplicationQuestionType = "text" | "textarea" | "radio" | "checkbox" | "select";

export interface ApplicationQuestionOption {
  value: string;
  label: string;
}

export interface ApplicationQuestion {
  id: string;
  label: string;
  description: string | null;
  questionType: ApplicationQuestionType;
  options: ApplicationQuestionOption[] | null;
  isRequired: boolean;
  sortOrder: number;
}

export interface ApplicationFormConfig {
  id?: string;
  notifyOnCapacityReached: boolean;
  notifyOnRemainingThreshold: number | null;
  completionMessageApp: string | null;
  completionMessageEmail: string | null;
  askName: FormFieldVisibility;
  askNameKana: FormFieldVisibility;
  askAffiliation: FormFieldVisibility;
  askGender: FormFieldVisibility;
  askAge: FormFieldVisibility;
  askOccupation: FormFieldVisibility;
  askNationality: FormFieldVisibility;
  reminderEnabled: boolean;
  reminderHoursBefore: number;
  reminderMessage: string | null;
}

export interface ApplicationFormPublic {
  config: Pick<
    ApplicationFormConfig,
    | "askName"
    | "askNameKana"
    | "askAffiliation"
    | "askGender"
    | "askAge"
    | "askOccupation"
    | "askNationality"
  >;
  questions: ApplicationQuestion[];
}

export interface ApplicationFormFull {
  config: ApplicationFormConfig | null;
  questions: ApplicationQuestion[];
}

export interface UpsertApplicationFormConfigInput {
  notifyOnCapacityReached?: boolean;
  notifyOnRemainingThreshold?: number | null;
  completionMessageApp?: string | null;
  completionMessageEmail?: string | null;
  askName?: FormFieldVisibility;
  askNameKana?: FormFieldVisibility;
  askAffiliation?: FormFieldVisibility;
  askGender?: FormFieldVisibility;
  askAge?: FormFieldVisibility;
  askOccupation?: FormFieldVisibility;
  askNationality?: FormFieldVisibility;
  reminderEnabled?: boolean;
  reminderHoursBefore?: number;
  reminderMessage?: string | null;
}

export interface CreateApplicationQuestionInput {
  label: string;
  description?: string;
  questionType: ApplicationQuestionType;
  options?: ApplicationQuestionOption[];
  isRequired?: boolean;
  sortOrder?: number;
}

export interface UpdateApplicationQuestionInput {
  label?: string;
  description?: string | null;
  questionType?: ApplicationQuestionType;
  options?: ApplicationQuestionOption[] | null;
  isRequired?: boolean;
  sortOrder?: number;
}

export interface ParticipantStatsAttribute {
  values: Array<{ key: string; count: number }>;
  answered: number;
}

export interface ParticipantStats {
  total: number;
  canceledTotal: number;
  attendedTotal: number;
  noShowTotal: number;
  attendanceRate: number | null;
  tickets: Array<{
    ticketId: string;
    ticketName: string;
    soldCount: number;
    capacity: number | null;
  }>;
  basicAttributes: {
    gender: ParticipantStatsAttribute;
    ageBands: ParticipantStatsAttribute;
    occupation: ParticipantStatsAttribute;
    affiliation: ParticipantStatsAttribute;
    nationality: ParticipantStatsAttribute;
  };
  questions: Array<{
    questionId: string;
    label: string;
    questionType: ApplicationQuestionType;
    answered: number;
    optionCounts?: Array<{ value: string; label: string; count: number }>;
  }>;
}

// --- Projects ---

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  status: string;
  publishStatus: string;
  memberCount: number;
  category: { id: string; name: string } | null;
  startDate: string | null;
  endDate: string | null;
  createdBy: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
}

export interface ProjectMember {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

export interface ProjectDetail extends ProjectListItem {
  inviteToken: string;
  inviteLinkEnabled: boolean;
  threadCount: number;
  taskCount: number;
  event: { id: string; title: string } | null;
  members: ProjectMember[];
  tags: { id: string; name: string; slug: string }[];
  updatedAt: string;
}

export interface ProjectThread {
  id: string;
  title: string;
  isPinned: boolean;
  replyCount: number;
  likeCount: number;
  lastReplyAt: string | null;
  createdBy: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  requestedDate: string | null;
  dueDate: string | null;
  sortOrder: number;
  createdBy: { id: string; name: string; avatarUrl: string | null };
  assignees: { id: string; userId: string; name: string; avatarUrl: string | null }[];
  createdAt: string;
}

export interface ProjectQuery {
  page?: number;
  limit?: number;
  status?: string;
  publishStatus?: string;
  search?: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  coverImageUrl?: string;
  categoryId?: string;
  eventId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

// --- Videos ---

export interface VideoListItem {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  publishStatus: string;
  streamStatus: string;
  viewCount: number;
  viewPermission: string;
  allowedRoles: string[];
  availableUntil: string | null;
  hasPassword: boolean;
  category: { id: string; name: string } | null;
  series: { id: string; name: string } | null;
  createdBy: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
}

export interface VideoDetail extends VideoListItem {
  videoProvider: string;
  videoExternalId: string;
  playbackUrl: string | null;
  watchOrder: number | null;
  sortOrder: number;
  instructors: VideoInstructor[];
  attachments: VideoAttachment[];
  tasks: VideoTaskItem[];
  prevVideo: { id: string; title: string; watchOrder: number | null } | null;
  nextVideo: { id: string; title: string; watchOrder: number | null } | null;
  seriesVideoCount: number | null;
  updatedAt: string;
}

export interface VideoInstructor {
  id: string;
  userId: string | null;
  name: string;
  affiliation: string | null;
  avatarUrl: string | null;
}

export interface VideoAttachment {
  id: string;
  fileId: string;
  fileName: string;
  fileUrl: string | null;
}

export type VideoTaskStatus = "not_started" | "in_progress" | "completed";

export interface VideoTaskItem {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  status?: VideoTaskStatus;
  statusUpdatedAt?: string;
  completedAt?: string;
}

export interface VideoWatchProgress {
  videoId: string;
  watchedSeconds: number;
  totalSeconds: number;
  isCompleted: boolean;
  lastPositionSeconds: number;
}

export interface VideoSeries {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

export interface VideoQuery {
  page?: number;
  limit?: number;
  publishStatus?: string;
  categoryId?: string;
  seriesId?: string;
  search?: string;
  viewPermission?: string;
  taskProgress?: "incomplete" | "complete" | "none";
}

export interface InstructorInput {
  userId?: string;
  name: string;
  affiliation?: string;
}

export interface TaskInput {
  id?: string;
  title: string;
  description?: string;
  sortOrder?: number;
}

export interface VideoTaskProgress {
  videoTitle: string;
  totalMembers: number;
  tasks: {
    id: string;
    title: string;
    description: string | null;
    completionCount: number;
    inProgressCount: number;
    notStartedCount: number;
    completedBy: {
      userId: string;
      name: string;
      avatarUrl: string | null;
      statusUpdatedAt: string;
      completedAt: string | null;
    }[];
    inProgressBy: {
      userId: string;
      name: string;
      avatarUrl: string | null;
      statusUpdatedAt: string;
    }[];
    notStartedBy: {
      userId: string;
      name: string;
      avatarUrl: string | null;
    }[];
  }[];
}

// --- Analytics ---

export interface AnalyticsDashboard {
  summary: {
    totalMembers: number;
    activeMembers: number;
    totalEvents: number;
    totalVideos: number;
  };
  snapshots: Array<{
    snapshotDate: string;
    totalMembers: number;
    activeMembers: number;
    newMembers: number;
    totalPosts: number;
    totalEvents: number;
    totalVideoViews: number;
  }>;
}

export interface MemberActivityItem {
  userId: string;
  user: { id: string; name: string; email: string; role: string; status: string };
  lastLoginAt: string | null;
  loginCount: number;
  postCount: number;
  commentCount: number;
  eventParticipationCount: number;
  videoWatchCount: number;
  chatMessageCount: number;
  projectCount: number;
}

export interface EngagementScoreItem {
  userId: string;
  user: { id: string; name: string; role: string };
  score: number;
  loginFrequencyScore: number;
  postFrequencyScore: number;
  eventParticipationScore: number;
  videoWatchScore: number;
  calculatedAt: string;
}

// --- Points ---

export interface PointSummary {
  id: string;
  userId: string;
  totalGranted: number;
  totalUtilized: number;
  totalExpired: number;
  availablePoints: number;
  lastActivityAt: string | null;
}

export interface PointHistory {
  id: string;
  userId: string;
  points: number;
  type: string;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  remainingPoints: number;
  expiresAt: string | null;
  grantedBy: { id: string; name: string } | null;
  createdAt: string;
}

export interface PointRule {
  id: string;
  name: string;
  triggerEvent: string;
  pointAmount: number;
  expiryDays: number;
  isActive: boolean;
  conditions: unknown;
  createdAt: string;
}

export interface PointHistoryQuery {
  page?: number;
  limit?: number;
  type?: string;
}

// --- Surveys ---

export interface SurveyListItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  isAnonymous: boolean;
  targetType: string;
  startsAt: string | null;
  endsAt: string | null;
  eventId: string | null;
  responseCount: number;
  notifiedAt: string | null;
  remindedAt: string | null;
  questionCount: number;
  createdBy: { id: string; name: string };
  createdAt: string;
}

export interface SurveyQuestion {
  id: string;
  surveyId: string;
  questionType: string;
  questionText: string;
  isRequired: boolean;
  sortOrder: number;
  options: Array<{ value: string; label: string }> | null;
  minValue: number | null;
  maxValue: number | null;
}

export interface SurveyDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  isAnonymous: boolean;
  targetType: string;
  startsAt: string | null;
  endsAt: string | null;
  responseCount: number;
  notifiedAt: string | null;
  remindedAt: string | null;
  createdBy: { id: string; name: string };
  questions: SurveyQuestion[];
  createdAt: string;
}

export interface SurveyQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  eventId?: string;
}

export interface SurveyPendingItem {
  id: string;
  title: string;
  description: string | null;
  eventId: string | null;
  eventTitle: string | null;
  questionCount: number;
  createdAt: string;
}

export interface SurveyRecipient {
  userId: string;
  name: string;
  avatarUrl: string | null;
  responded: boolean;
  respondedAt: string | null;
}

export interface SurveyRecipientsResponse {
  survey: {
    id: string;
    title: string;
    status: string;
    notifiedAt: string | null;
    remindedAt: string | null;
    responseCount: number;
  };
  recipients: SurveyRecipient[];
}

export interface SurveyResultQuestion {
  question: SurveyQuestion;
  totalAnswers: number;
  optionCounts?: Record<string, number>;
  average?: number | null;
  min?: number | null;
  max?: number | null;
  textAnswers?: string[];
}

export interface SurveyResults {
  survey: { id: string; title: string; responseCount: number };
  results: SurveyResultQuestion[];
}

// --- Skills ---

export interface SkillListItem {
  id: string;
  title: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  format: string;
  status: string;
  bookingCount: number;
  category: { id: string; name: string } | null;
  provider: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
}

export interface SkillBooking {
  id: string;
  skillListingId: string;
  requesterUserId: string;
  providerUserId: string;
  status: string;
  scheduledAt: string | null;
  message: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  skillListing: { id: string; title: string; price: number };
  requester: { id: string; name: string };
  provider: { id: string; name: string };
}

export interface SkillMessage {
  id: string;
  bookingId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string };
}

export interface SkillComment {
  id: string;
  skillListingId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; profile?: { avatarUrl: string | null } };
}

export interface SkillQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  format?: string;
  search?: string;
}

// --- Shop ---
export interface ProductListItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number | null;
  publishStatus: string;
  status: string;
  salesCount: number;
  imageUrl: string | null;
  category: { id: string; name: string } | null;
  series: { id: string; name: string } | null;
  seller: { id: string; name: string };
  saleStartAt: string | null;
  saleEndAt: string | null;
  createdAt: string;
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  seriesId?: string;
  search?: string;
  publishStatus?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  notes: string | null;
  buyer: { id: string; name: string };
  seller: { id: string; name: string };
  items: OrderItem[];
  createdAt: string;
}

// --- Albums ---
export interface AlbumListItem {
  id: string;
  title: string;
  description: string | null;
  coverPhotoUrl: string | null;
  publishStatus: string;
  photoCount: number;
  category: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  createdAt: string;
}

// --- Venues ---
export interface VenueListItem {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  venueTypes: string[];
  capacity: number | null;
  publishStatus: string;
  _count: { spaces: number };
  images?: Array<{ id: string; file: { publicUrl: string | null } }>;
}

export interface VenueDetail extends VenueListItem {
  accessInfo: string | null;
  spaces: Array<{
    id: string;
    name: string;
    description: string | null;
    capacity: number | null;
    spaceTypes: string[];
    isReservable: boolean;
  }>;
  events: Array<{
    id: string;
    title: string;
    startAt: string;
    participantCount: number;
  }>;
}

export interface Reservation {
  id: string;
  spaceId: string;
  title: string | null;
  startAt: string;
  endAt: string;
  status: string;
  note: string | null;
  user: { id: string; name: string };
  createdAt: string;
}

export interface VenueReservation extends Reservation {
  space: { id: string; name: string };
}

// --- Announcements ---
export interface Announcement {
  id: string;
  title: string;
  body: string;
  targetAudience: string;
  isPublished: boolean;
  publishedAt: string | null;
  pinnedUntil: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
}

// --- FAQ ---
export interface FaqArticle {
  id: string;
  category: string;
  title: string;
  body: string;
  sortOrder: number;
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
}

// --- Memos ---
export interface MemoCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Memo {
  id: string;
  title: string;
  body: string | null;
  category: MemoCategory | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoDetail extends Memo {
  attachments: Array<{
    id: string;
    fileId: string;
    file: { id: string; publicUrl: string | null; originalName: string; contentType: string };
  }>;
}

// --- Schedules ---
export interface Schedule {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  location: string | null;
  visibility: string;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
}

// --- Moderation ---
export interface ContentReport {
  id: string;
  reporterUserId: string;
  reporter: { id: string; name: string };
  targetType: string;
  targetId: string;
  category: string;
  description: string | null;
  status: string;
  assignedTo: { id: string; name: string } | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface ModerationActionItem {
  id: string;
  actionType: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  notes: string | null;
  moderator: { id: string; name: string };
  createdAt: string;
}

export interface ContentReportDetail extends ContentReport {
  actions: ModerationActionItem[];
}

export interface BannedWord {
  id: string;
  word: string;
  matchType: string;
  action: string;
  replacement: string | null;
  isActive: boolean;
}

// --- Orientation ---
export interface OrientationPage {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
}

export interface OrientationCompletion {
  id: string;
  userId: string;
  completedAt: string;
}

// --- Contents ---
export interface ContentListItem {
  id: string;
  name: string;
  contentType: string;
  description: string | null;
  price: number | null;
  coverImageUrl: string | null;
  inviteToken: string;
  publishStatus: string;
  createdBy: { id: string; name: string };
  createdAt: string;
}

// --- Event Results ---

export type EventExecutionStatus =
  | "as_planned"
  | "modified"
  | "partially_held"
  | "postponed"
  | "canceled";

export type EventResultStatus = "draft" | "completed";

export type EventResultPublishStatus = "public" | "private";

export interface EventResultAttachmentFile {
  id: string;
  originalName: string;
  contentType: string;
  fileSizeBytes: number;
  storageKey: string;
  storageBucket: string;
  publicUrl: string | null;
}

export interface EventResultAttachment {
  id: string;
  sortOrder: number;
  file: EventResultAttachmentFile;
  createdAt: string;
}

export interface EventResult {
  id: string;
  eventId: string;
  attendanceCount: number;
  attendanceRate: number | null;
  summary: string | null;
  achievementNotes: string | null;
  improvementNotes: string | null;
  executionStatus: EventExecutionStatus;
  status: EventResultStatus;
  publishStatus: EventResultPublishStatus;
  createdBy: { id: string; name: string; avatarUrl: string | null };
  attachments: EventResultAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertEventResultInput {
  attendanceCount: number;
  summary?: string | null;
  achievementNotes?: string | null;
  improvementNotes?: string | null;
  executionStatus: EventExecutionStatus;
  status: EventResultStatus;
  publishStatus: EventResultPublishStatus;
}

// --- File Manager ---

export type FileEntryType = "file" | "folder";
export type FileSortField = "name" | "updatedAt" | "size";

export interface FileEntryDetail {
  id: string;
  originalName: string;
  contentType: string;
  fileSizeBytes: number;
  publicUrl: string | null;
  thumbnailUrl: string | null;
}

export interface FileEntry {
  id: string;
  type: FileEntryType;
  name: string;
  parentFolderId: string | null;
  sortOrder: number;
  uploadedBy: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
  updatedAt: string;
  file: FileEntryDetail | null;
}

export interface FolderDetail {
  id: string;
  name: string;
  parentFolderId: string | null;
  breadcrumb: Array<{ id: string; name: string }>;
}

export interface CreateFolderInput {
  parentFolderId?: string;
  name: string;
}

export interface RegisterFileInput {
  fileId: string;
  parentFolderId?: string;
  name?: string;
}

export interface RenameInput {
  name: string;
}

export interface MoveInput {
  parentFolderId?: string | null;
}

export interface FileListQuery {
  folderId?: string;
  q?: string;
  sort?: FileSortField;
  order?: "asc" | "desc";
}
