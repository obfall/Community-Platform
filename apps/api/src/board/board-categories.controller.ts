import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BoardCategoriesService } from "./board-categories.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto";
import { CurrentUser, FeatureEnabled, Roles } from "@/common/decorators";
import { FeatureEnabledGuard, RolesGuard } from "@/common/guards";

@ApiTags("board")
@ApiBearerAuth()
@FeatureEnabled("board")
@UseGuards(FeatureEnabledGuard)
@Controller("board/categories")
export class BoardCategoriesController {
  constructor(private readonly categoriesService: BoardCategoriesService) {}

  @Get()
  @ApiOperation({ summary: "カテゴリ一覧" })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  @Roles("owner", "admin")
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "カテゴリ作成" })
  create(@CurrentUser("id") userId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(userId, dto);
  }

  @Patch(":id")
  @Roles("owner", "admin")
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "カテゴリ更新" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(":id")
  @Roles("owner", "admin")
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "カテゴリ削除" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.categoriesService.softDelete(id);
  }
}
