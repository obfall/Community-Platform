import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserLibraryService } from "./user-library.service";
import { CreateLibraryItemDto, UpdateLibraryItemDto } from "./dto";
import { CurrentUser } from "@/common/decorators";

@ApiTags("user-library")
@ApiBearerAuth()
@Controller("user-library")
export class UserLibraryController {
  constructor(private readonly service: UserLibraryService) {}

  @Get()
  @ApiOperation({ summary: "ライブラリー一覧" })
  findAll(@CurrentUser("id") userId: string) {
    return this.service.findAll(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "ライブラリーアイテム詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string, @CurrentUser("id") userId: string) {
    return this.service.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: "ライブラリーにアイテム追加" })
  create(@CurrentUser("id") userId: string, @Body() dto: CreateLibraryItemDto) {
    return this.service.create(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "ライブラリーアイテム更新" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateLibraryItemDto,
  ) {
    return this.service.update(id, userId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "ライブラリーアイテム削除" })
  remove(@Param("id", ParseUUIDPipe) id: string, @CurrentUser("id") userId: string) {
    return this.service.remove(id, userId);
  }
}
