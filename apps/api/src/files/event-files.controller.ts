import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { StorageService } from "./storage/storage.service";
import { EventFilesService } from "./event-files.service";
import {
  CreateFolderDto,
  RegisterFileDto,
  RenameDto,
  MoveDto,
  ReorderDto,
  ListFilesQueryDto,
} from "./dto";
import { CurrentUser } from "@/common/decorators";

@ApiTags("event-files")
@ApiBearerAuth()
@Controller("events/:eventId/files")
export class EventFilesController {
  constructor(
    private readonly service: EventFilesService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: "イベントファイル一覧" })
  async list(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Query() query: ListFilesQueryDto,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(eventId, userId);
    return this.service.list(eventId, query);
  }

  @Get("folders/:folderId")
  @ApiOperation({ summary: "フォルダ詳細 + パンくず" })
  async getFolder(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Param("folderId", ParseUUIDPipe) folderId: string,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(eventId, userId);
    return this.service.getFolder(eventId, folderId);
  }

  @Post("folders")
  @ApiOperation({ summary: "フォルダ作成" })
  async createFolder(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Body() dto: CreateFolderDto,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(eventId, userId);
    return this.service.createFolder(eventId, userId, dto);
  }

  @Post()
  @ApiOperation({ summary: "ファイル登録（アップロード済 fileId を紐付け）" })
  async registerFile(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Body() dto: RegisterFileDto,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(eventId, userId);
    return this.service.registerFile(eventId, userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "名前変更" })
  async rename(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RenameDto,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(eventId, userId);
    return this.service.rename(eventId, id, dto);
  }

  @Patch(":id/move")
  @ApiOperation({ summary: "移動（親フォルダ変更）" })
  async move(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: MoveDto,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(eventId, userId);
    return this.service.move(eventId, id, dto);
  }

  @Patch("reorder")
  @ApiOperation({ summary: "並び替え" })
  async reorder(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Body() dto: ReorderDto,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(eventId, userId);
    return this.service.reorder(eventId, dto);
  }

  @Get(":id/download")
  @ApiOperation({ summary: "ファイルダウンロード" })
  async download(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
    @Res() res: Response,
  ) {
    await this.service.ensureMember(eventId, userId);
    const info = await this.service.getDownloadInfo(eventId, id);
    const { stream, contentType } = await this.storage.getObject(info.storageKey);

    const encoded = encodeURIComponent(info.fileName);
    res.set({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
    });
    stream.pipe(res);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "削除（フォルダは再帰削除）" })
  async remove(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(eventId, userId);
    return this.service.remove(eventId, id);
  }
}
