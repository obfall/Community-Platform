import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { FeatureEnabledGuard } from "@/common/guards";
import { MemosService } from "./memos.service";
import { CreateMemoDto, UpdateMemoDto, CreateMemoCategoryDto } from "./dto";

@Controller("memos")
@ApiTags("Memos")
@ApiBearerAuth()
@FeatureEnabled("memo")
@UseGuards(FeatureEnabledGuard)
export class MemosController {
  constructor(private readonly service: MemosService) {}

  @Get()
  @ApiOperation({ summary: "メモ一覧" })
  findAll(
    @CurrentUser("id") userId: string,
    @Query("categoryId") categoryId?: string,
    @Query("search") search?: string,
  ) {
    return this.service.findAll(userId, { categoryId, search });
  }

  @Get("categories")
  @ApiOperation({ summary: "メモカテゴリ一覧" })
  getCategories(@CurrentUser("id") userId: string) {
    return this.service.getCategories(userId);
  }

  @Post("categories")
  @ApiOperation({ summary: "メモカテゴリ作成" })
  createCategory(@CurrentUser("id") userId: string, @Body() dto: CreateMemoCategoryDto) {
    return this.service.createCategory(userId, dto.name);
  }

  @Delete("categories/:id")
  @ApiOperation({ summary: "メモカテゴリ削除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCategory(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.service.removeCategory(userId, id);
  }

  @Get(":id")
  @ApiOperation({ summary: "メモ詳細" })
  findOne(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(userId, id);
  }

  @Post()
  @ApiOperation({ summary: "メモ作成" })
  create(@CurrentUser("id") userId: string, @Body() dto: CreateMemoDto) {
    return this.service.create(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "メモ更新" })
  update(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemoDto,
  ) {
    return this.service.update(userId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "メモ削除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.service.remove(userId, id);
  }
}
