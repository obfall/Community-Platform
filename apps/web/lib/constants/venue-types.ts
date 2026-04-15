export const VENUE_TYPE_OPTIONS = [
  { value: "theater", label: "劇場" },
  { value: "concert_hall", label: "コンサート（音楽）ホール" },
  { value: "lecture_hall", label: "講演ホール" },
  { value: "plaza", label: "広場" },
  { value: "classroom_large", label: "教室(大)" },
  { value: "exhibition_hall", label: "展示ホール" },
  { value: "reception_hall", label: "レセプションホール" },
  { value: "dining_space", label: "飲食スペース" },
  { value: "conference_room_large", label: "会議室(大)" },
  { value: "live_house", label: "ライブハウス" },
  { value: "gymnasium", label: "体育館" },
  { value: "other", label: "その他" },
] as const;

export const VENUE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  VENUE_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);
