import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { LocalesService } from "./locales.service";
import { CreateLocaleDto, UpdateLocaleDto } from "./dto";
import { Public, Roles } from "@/common/decorators";
import { RolesGuard } from "@/common/guards";

@ApiTags("i18n/locales")
@ApiBearerAuth()
@Controller("i18n/locales")
export class LocalesController {
  constructor(private readonly localesService: LocalesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "ロケール一覧（公開）" })
  findAll() {
    return this.localesService.findAll();
  }

  @Post()
  @Roles("admin", "owner")
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "ロケール作成（管理）" })
  create(@Body() dto: CreateLocaleDto) {
    return this.localesService.create(dto);
  }

  @Patch(":code")
  @Roles("admin", "owner")
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "ロケール更新（管理）" })
  update(@Param("code") code: string, @Body() dto: UpdateLocaleDto) {
    return this.localesService.update(code, dto);
  }

  @Delete(":code")
  @Roles("admin", "owner")
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "ロケール削除（管理）" })
  async remove(@Param("code") code: string) {
    await this.localesService.remove(code);
  }
}
