import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { FilesService } from "./files.service";
import { UploadFileDto, FileQueryDto } from "./dto";
import { CurrentUser } from "@/common/decorators";

@ApiTags("files")
@ApiBearerAuth()
@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("upload")
  @ApiOperation({ summary: "ファイルアップロード" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @CurrentUser("id") userId: string,
  ) {
    if (!file) {
      throw new BadRequestException("ファイルが選択されていません");
    }
    return this.filesService.upload(file, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: "ファイル一覧" })
  findAll(@Query() query: FileQueryDto, @CurrentUser("id") userId: string) {
    return this.filesService.findAll(query, userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "ファイル詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string, @CurrentUser("id") userId: string) {
    return this.filesService.findOne(id, userId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "ファイル削除" })
  remove(@Param("id", ParseUUIDPipe) id: string, @CurrentUser("id") userId: string) {
    return this.filesService.remove(id, userId);
  }
}
