import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionsService } from "./permissions.service";
import { PermissionQueryDto, CreatePermissionDto, UpdatePermissionDto } from "./dto";
import { Roles } from "@/common/decorators";
import { RolesGuard } from "@/common/guards";

@ApiTags("settings/permissions")
@ApiBearerAuth()
@Roles("owner", "admin")
@UseGuards(RolesGuard)
@Controller("settings/permissions")
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiOperation({ summary: "権限設定一覧" })
  findAll(@Query() query: PermissionQueryDto) {
    return this.permissionsService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: "権限設定作成" })
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "権限設定更新" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdatePermissionDto) {
    return this.permissionsService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "権限設定削除" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.permissionsService.remove(id);
  }
}
