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
import { ProjectFilesService } from "./project-files.service";
import {
  CreateFolderDto,
  RegisterFileDto,
  RenameDto,
  MoveDto,
  ReorderDto,
  ListFilesQueryDto,
} from "./dto";
import { CurrentUser } from "@/common/decorators";

@ApiTags("project-files")
@ApiBearerAuth()
@Controller("projects/:projectId/files")
export class ProjectFilesController {
  constructor(
    private readonly service: ProjectFilesService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: "プロジェクトファイル一覧" })
  async list(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Query() query: ListFilesQueryDto,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(projectId, userId);
    return this.service.list(projectId, query);
  }

  @Get("folders/:folderId")
  @ApiOperation({ summary: "フォルダ詳細 + パンくず" })
  async getFolder(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("folderId", ParseUUIDPipe) folderId: string,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(projectId, userId);
    return this.service.getFolder(projectId, folderId);
  }

  @Post("folders")
  @ApiOperation({ summary: "フォルダ作成" })
  async createFolder(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() dto: CreateFolderDto,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(projectId, userId);
    return this.service.createFolder(projectId, userId, dto);
  }

  @Post()
  @ApiOperation({ summary: "ファイル登録（アップロード済 fileId を紐付け）" })
  async registerFile(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() dto: RegisterFileDto,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(projectId, userId);
    return this.service.registerFile(projectId, userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "名前変更" })
  async rename(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RenameDto,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(projectId, userId);
    return this.service.rename(projectId, id, dto);
  }

  @Patch(":id/move")
  @ApiOperation({ summary: "移動（親フォルダ変更）" })
  async move(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: MoveDto,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(projectId, userId);
    return this.service.move(projectId, id, dto);
  }

  @Patch("reorder")
  @ApiOperation({ summary: "並び替え" })
  async reorder(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() dto: ReorderDto,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(projectId, userId);
    return this.service.reorder(projectId, dto);
  }

  @Get(":id/download")
  @ApiOperation({ summary: "ファイルダウンロード" })
  async download(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
    @Res() res: Response,
  ) {
    await this.service.ensureMember(projectId, userId);
    const info = await this.service.getDownloadInfo(projectId, id);
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
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
  ) {
    await this.service.ensureMember(projectId, userId);
    return this.service.remove(projectId, id);
  }
}
