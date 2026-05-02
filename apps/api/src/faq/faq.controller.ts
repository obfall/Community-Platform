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
import { Roles } from "@/common/decorators/roles.decorator";
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { RolesGuard, FeatureEnabledGuard } from "@/common/guards";
import { FaqService } from "./faq.service";
import { CreateFaqDto, UpdateFaqDto, FaqQueryDto } from "./dto";

@Controller("faq")
@ApiTags("FAQ")
@ApiBearerAuth()
@FeatureEnabled("faq")
@UseGuards(FeatureEnabledGuard)
export class FaqController {
  constructor(private readonly service: FaqService) {}

  @Get()
  @ApiOperation({ summary: "FAQ一覧" })
  findAll(@Query() query: FaqQueryDto) {
    return this.service.findAll(query);
  }

  @Get("categories")
  @ApiOperation({ summary: "FAQカテゴリ一覧" })
  getCategories() {
    return this.service.getCategories();
  }

  @Get(":id")
  @ApiOperation({ summary: "FAQ詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "FAQ作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  create(@Body() dto: CreateFaqDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "FAQ更新" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateFaqDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "FAQ削除" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
