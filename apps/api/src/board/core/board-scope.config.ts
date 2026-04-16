import type { BoardScopeConfig } from "./board-core.service";

/** グローバル掲示板。スコープ絞り込みなし */
export const GLOBAL_BOARD_SCOPE: BoardScopeConfig = {
  categoryDelegate: "boardCategory",
  topicDelegate: "boardTopic",
  topicPostDelegate: "boardTopicPost",
  topicPostCommentDelegate: "boardTopicPostComment",
  likeDelegate: "boardLike",
  scopeField: null,
};

/** プロジェクト掲示板。projectId でスコープ絞り込み */
export const PROJECT_BOARD_SCOPE: BoardScopeConfig = {
  categoryDelegate: "projectBoardCategory",
  topicDelegate: "projectBoardTopic",
  topicPostDelegate: "projectBoardTopicPost",
  topicPostCommentDelegate: "projectBoardTopicPostComment",
  likeDelegate: "projectBoardLike",
  scopeField: "projectId",
};

/** イベント掲示板。eventId でスコープ絞り込み */
export const EVENT_BOARD_SCOPE: BoardScopeConfig = {
  categoryDelegate: "eventBoardCategory",
  topicDelegate: "eventBoardTopic",
  topicPostDelegate: "eventBoardTopicPost",
  topicPostCommentDelegate: "eventBoardTopicPostComment",
  likeDelegate: "eventBoardLike",
  scopeField: "eventId",
};
