import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BoardPostsService } from "./board-posts.service";
import { CreatePostDto, UpdatePostDto, PostQueryDto } from "./dto";
import { CurrentUser, FeatureEnabled, Roles } from "@/common/decorators";
import { FeatureEnabledGuard, RolesGuard } from "@/common/guards";

@ApiTags("board")
@ApiBearerAuth()
@FeatureEnabled("board")
@UseGuards(FeatureEnabledGuard)
@Controller("board/posts")
export class BoardPostsController {
  constructor(private readonly postsService: BoardPostsService) {}

  @Get()
  @ApiOperation({ summary: "投稿一覧" })
  findAll(@CurrentUser("id") userId: string, @Query() query: PostQueryDto) {
    return this.postsService.findAll(userId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "投稿詳細" })
  findOne(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.postsService.findOne(userId, id);
  }

  @Post()
  @ApiOperation({ summary: "投稿作成" })
  create(@CurrentUser("id") userId: string, @Body() dto: CreatePostDto) {
    return this.postsService.create(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "投稿更新" })
  update(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(userId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "投稿削除" })
  remove(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.postsService.softDelete(userId, id);
  }

  @Patch(":id/pin")
  @Roles("owner", "admin")
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "投稿ピン留めトグル" })
  togglePin(@Param("id", ParseUUIDPipe) id: string) {
    return this.postsService.togglePin(id);
  }
}
