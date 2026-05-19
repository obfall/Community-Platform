import { z } from "zod";
import {
  MAX_VIDEO_TITLE_LENGTH,
  MAX_VIDEO_TASK_TITLE_LENGTH,
  MAX_VIDEO_INSTRUCTOR_NAME_LENGTH,
  MAX_VIDEO_INSTRUCTOR_AFFILIATION_LENGTH,
  MAX_VIDEO_INSTRUCTORS,
  MAX_VIDEO_ATTACHMENTS,
  MAX_VIDEO_TASKS,
  VIDEO_PASSWORD_LENGTH,
  PublishStatus,
} from "@community-platform/shared";

// 動画フォーム共通 Zod スキーマ。new / edit ページで共有する。
// エラーメッセージは i18n 化のため呼び出し側から t を渡して buildVideoFormSchema を使う。
//
// 各フィールド:
// - title: 必須 / 上限 200 文字
// - description: 任意
// - seriesId: 任意 UUID。"" の場合は未選択扱い（送信側で null に変換）
// - watchOrder: シリーズ選択時のみ意味を持つ整数。文字列で持って送信時に Number 変換
// - publishStatus: draft / published / unpublished
// - availableUntil: datetime-local 文字列（空なら期限なし）
// - password: 4 桁数字 or 空文字
// - clearPassword: edit でのみ使う。true でサーバへ null 送信
// - instructors / attachments / tasks: 配列。子コンポーネント側で並び替え・追加削除する

export interface BuildVideoFormSchemaT {
  required: (field: string) => string;
  maxLength: (field: string, max: number) => string;
  passwordDigits: (len: number) => string;
}

export function buildVideoFormSchema(t: BuildVideoFormSchemaT) {
  const instructorSchema = z.object({
    userId: z.string().uuid().optional(),
    name: z
      .string()
      .min(1, t.required("name"))
      .max(MAX_VIDEO_INSTRUCTOR_NAME_LENGTH, t.maxLength("name", MAX_VIDEO_INSTRUCTOR_NAME_LENGTH)),
    affiliation: z.string().max(MAX_VIDEO_INSTRUCTOR_AFFILIATION_LENGTH).optional(),
  });

  const taskSchema = z.object({
    id: z.string().uuid().optional(),
    title: z
      .string()
      .min(1, t.required("title"))
      .max(MAX_VIDEO_TASK_TITLE_LENGTH, t.maxLength("title", MAX_VIDEO_TASK_TITLE_LENGTH)),
    description: z.string().optional(),
    sortOrder: z.number().int().min(0).optional(),
    fileIds: z.array(z.string().uuid()).optional(),
  });

  const attachmentSchema = z.object({
    fileId: z.string().uuid(),
    url: z.string().nullable(),
    name: z.string(),
    contentType: z.string(),
  });

  return z.object({
    title: z
      .string()
      .min(1, t.required("title"))
      .max(MAX_VIDEO_TITLE_LENGTH, t.maxLength("title", MAX_VIDEO_TITLE_LENGTH)),
    description: z.string().optional(),
    seriesId: z.string().optional(),
    watchOrder: z.string().optional(),
    publishStatus: z.enum([
      PublishStatus.DRAFT,
      PublishStatus.PUBLISHED,
      PublishStatus.UNPUBLISHED,
    ]),
    availableUntil: z.string().optional(),
    password: z
      .string()
      .regex(
        new RegExp(`^(\\d{${VIDEO_PASSWORD_LENGTH}})?$`),
        t.passwordDigits(VIDEO_PASSWORD_LENGTH),
      )
      .optional(),
    clearPassword: z.boolean().optional(),
    instructors: z.array(instructorSchema).max(MAX_VIDEO_INSTRUCTORS),
    attachments: z.array(attachmentSchema).max(MAX_VIDEO_ATTACHMENTS),
    tasks: z.array(taskSchema).max(MAX_VIDEO_TASKS),
  });
}

export type VideoFormValues = z.infer<ReturnType<typeof buildVideoFormSchema>>;
