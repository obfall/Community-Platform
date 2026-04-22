import { Controller, Get, Query, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { Roles } from "@/common/decorators/roles.decorator";
import { RolesGuard } from "@/common/guards";
import { ListActivityLogDto } from "./dto/list-activity-log.dto";
import { ListLoginHistoryDto } from "./dto/list-login-history.dto";
import { UsageHistoryService } from "./usage-history.service";

const CSV_BOM = "﻿";

function escapeCsv(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvBody(headers: string[], rows: string[][]): Buffer {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(","));
  }
  return Buffer.from(CSV_BOM + lines.join("\r\n"), "utf-8");
}

function setCsvHeaders(res: Response, fileName: string): void {
  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename=${fileName}`,
  });
}

function todayStamp(): string {
  return new Date().toISOString().split("T")[0]!.replace(/-/g, "");
}

@Controller("usage-history")
@ApiTags("Usage History")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles("admin", "owner")
export class UsageHistoryController {
  constructor(private readonly service: UsageHistoryService) {}

  @Get("activity")
  @ApiOperation({ summary: "操作ログ一覧" })
  listActivity(@Query() query: ListActivityLogDto) {
    return this.service.listActivityLogs(query);
  }

  @Get("activity/export")
  @ApiOperation({ summary: "操作ログ CSV エクスポート" })
  async exportActivity(
    @Query() query: ListActivityLogDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const logs = await this.service.getActivityLogsForExport(query);
    const headers = [
      "日時",
      "ユーザー名",
      "メール",
      "アクション",
      "リソース種別",
      "リソースID",
      "metadata",
    ];
    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.user?.name ?? "",
      log.user?.email ?? "",
      log.action,
      log.resourceType ?? "",
      log.resourceId ?? "",
      log.metadata ? JSON.stringify(log.metadata) : "",
    ]);

    setCsvHeaders(res, `activity-logs_${todayStamp()}.csv`);
    return new StreamableFile(buildCsvBody(headers, rows));
  }

  @Get("logins")
  @ApiOperation({ summary: "ログイン履歴一覧" })
  listLogins(@Query() query: ListLoginHistoryDto) {
    return this.service.listLoginHistories(query);
  }

  @Get("logins/export")
  @ApiOperation({ summary: "ログイン履歴 CSV エクスポート" })
  async exportLogins(
    @Query() query: ListLoginHistoryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const logs = await this.service.getLoginHistoriesForExport(query);
    const headers = ["日時", "ユーザー名", "メール", "結果", "失敗理由", "UserAgent"];
    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.user?.name ?? "",
      log.user?.email ?? "",
      log.status,
      log.failureReason ?? "",
      log.userAgent ?? "",
    ]);

    setCsvHeaders(res, `login-histories_${todayStamp()}.csv`);
    return new StreamableFile(buildCsvBody(headers, rows));
  }
}
