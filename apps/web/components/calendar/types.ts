export interface CalendarItem {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  isAllDay?: boolean;
  color: "blue" | "orange" | "green" | "gray" | "purple";
  onClick?: () => void;
}

export type CalendarView = "month" | "week";
