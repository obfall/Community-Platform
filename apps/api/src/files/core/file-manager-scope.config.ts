import type { FileManagerScopeConfig } from "./file-manager.types";

/** プロジェクトファイル。projectId でスコープ絞り込み */
export const PROJECT_FILE_SCOPE: FileManagerScopeConfig = {
  scopeField: "projectId",
  delegate: "projectFile",
};

/** イベントファイル。eventId でスコープ絞り込み */
export const EVENT_FILE_SCOPE: FileManagerScopeConfig = {
  scopeField: "eventId",
  delegate: "eventFile",
};
