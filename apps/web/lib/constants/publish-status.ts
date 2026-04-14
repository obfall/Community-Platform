export type PublishStatus = "draft" | "published" | "unpublished";

export const PUBLISH_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  published: "公開",
  unpublished: "未公開",
};

export const PUBLISH_STATUS_OPTIONS: { value: PublishStatus; label: string }[] = [
  { value: "draft", label: "下書き" },
  { value: "published", label: "公開" },
  { value: "unpublished", label: "未公開" },
];
