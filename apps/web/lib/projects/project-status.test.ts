import { describe, it, expect } from "vitest";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_VALUES,
  PROJECT_STATUS_VARIANTS,
} from "./project-status";
import enumsMessages from "@/messages/ja/enums.json";

describe("project-status 定数", () => {
  describe("PROJECT_STATUS_VALUES: enum 値の列挙", () => {
    it("4 つのステータスを保持する", () => {
      expect(PROJECT_STATUS_VALUES).toEqual([
        "not_started",
        "in_progress",
        "completed",
        "cancelled",
      ]);
    });
  });

  describe("PROJECT_STATUS_VARIANTS: 全 enum に variant が定義されている", () => {
    it.each(PROJECT_STATUS_VALUES)("%s に対応する variant が定義されている", (value) => {
      expect(PROJECT_STATUS_VARIANTS[value]).toBeDefined();
    });

    it("意味付け（イベントステータスと揃える）の対応関係を満たす", () => {
      expect(PROJECT_STATUS_VARIANTS.not_started).toBe("secondary");
      expect(PROJECT_STATUS_VARIANTS.in_progress).toBe("success");
      expect(PROJECT_STATUS_VARIANTS.completed).toBe("outline");
      expect(PROJECT_STATUS_VARIANTS.cancelled).toBe("destructive");
    });
  });

  describe("PROJECT_STATUS_LABELS: enums.projectStatus と一致", () => {
    it("全 enum 値の日本語ラベルが enums.json の projectStatus と同じ", () => {
      const enumLabels = (enumsMessages as { projectStatus: Record<string, string> }).projectStatus;
      for (const value of PROJECT_STATUS_VALUES) {
        expect(PROJECT_STATUS_LABELS[value]).toBe(enumLabels[value]);
      }
    });
  });
});
