import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { Response } from "express";
import { Roles } from "@/common/decorators/roles.decorator";
import { RolesGuard } from "@/common/guards";
import { MemberAttributesService } from "./member-attributes.service";
import { CreateMemberAttributeDto } from "./dto/create-member-attribute.dto";
import { UpdateMemberAttributeDto } from "./dto/update-member-attribute.dto";
import { SetAttributeValuesDto } from "./dto/set-attribute-values.dto";
import { ReorderAttributesDto } from "./dto/reorder-attributes.dto";

@Controller("member-attributes")
@ApiTags("Member Attributes")
@ApiBearerAuth()
export class MemberAttributesController {
  constructor(private readonly service: MemberAttributesService) {}

  @Get()
  @ApiOperation({ summary: "属性定義一覧" })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiOperation({ summary: "属性定義作成" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  create(@Body() dto: CreateMemberAttributeDto) {
    return this.service.create(dto);
  }

  @Patch("reorder")
  @ApiOperation({ summary: "属性定義並び替え" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  reorder(@Body() dto: ReorderAttributesDto) {
    return this.service.reorder(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "属性定義更新" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateMemberAttributeDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "属性定義削除" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}

@Controller("users")
@ApiTags("User Attributes")
@ApiBearerAuth()
export class UserAttributesController {
  constructor(private readonly service: MemberAttributesService) {}

  @Get("export/csv")
  @ApiOperation({ summary: "メンバー CSV エクスポート" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  async exportCsv(@Res({ passthrough: true }) res: Response) {
    const { attributes, users } = await this.service.getExportData();

    // ヘッダー行
    const fixedHeaders = ["名前", "メール", "ロール", "ステータス", "ランク", "登録日"];
    const attrHeaders = attributes.map((a) => a.name);
    const headers = [...fixedHeaders, ...attrHeaders];

    // データ行
    const rows = users.map((user) => {
      const valueMap = new Map(user.attributeValues.map((v) => [v.attributeId, v.value]));
      const fixedCols = [
        user.name,
        user.email,
        user.role,
        user.status,
        user.rank?.name ?? "",
        user.createdAt.toISOString().split("T")[0],
      ];
      const attrCols = attributes.map((a) => valueMap.get(a.id) ?? "");
      return [...fixedCols, ...attrCols];
    });

    // CSV 生成（UTF-8 BOM 付き）
    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csvLines = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map((col) => escapeCsv(col ?? "")).join(",")),
    ];
    const bom = "\uFEFF";
    const csvContent = bom + csvLines.join("\n");

    const today = new Date().toISOString().split("T")[0]!.replace(/-/g, "");
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=members_${today}.csv`,
    });

    return new StreamableFile(Buffer.from(csvContent, "utf-8"));
  }

  @Get(":id/attributes")
  @ApiOperation({ summary: "ユーザーの属性値一覧" })
  getUserAttributes(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.getUserAttributes(id);
  }

  @Patch(":id/attributes")
  @ApiOperation({ summary: "ユーザーの属性値一括設定" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  setUserAttributes(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SetAttributeValuesDto) {
    return this.service.setUserAttributes(id, dto);
  }
}
