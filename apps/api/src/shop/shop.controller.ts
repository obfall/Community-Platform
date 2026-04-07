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
import { Roles } from "@/common/decorators/roles.decorator";
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { RolesGuard, FeatureEnabledGuard } from "@/common/guards";
import { ShopService } from "./shop.service";
import { CreateProductDto, ProductQueryDto, CreateOrderDto } from "./dto";

@Controller("shop")
@ApiTags("Shop")
@ApiBearerAuth()
@FeatureEnabled("ec_shop")
@UseGuards(FeatureEnabledGuard)
export class ShopController {
  constructor(private readonly service: ShopService) {}

  @Get("products")
  @ApiOperation({ summary: "商品一覧" })
  findAll(@Query() query: ProductQueryDto) {
    return this.service.findAllProducts(query);
  }

  @Get("products/:id")
  @ApiOperation({ summary: "商品詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOneProduct(id);
  }

  @Post("products")
  @ApiOperation({ summary: "商品登録" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  create(@CurrentUser("id") userId: string, @Body() dto: CreateProductDto) {
    return this.service.createProduct(userId, dto);
  }

  @Patch("products/:id")
  @ApiOperation({ summary: "商品更新" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: Partial<CreateProductDto> & { publishStatus?: string },
  ) {
    return this.service.updateProduct(id, data);
  }

  @Delete("products/:id")
  @ApiOperation({ summary: "商品削除" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.removeProduct(id);
  }

  @Post("orders")
  @ApiOperation({ summary: "注文作成" })
  createOrder(@CurrentUser("id") userId: string, @Body() dto: CreateOrderDto) {
    return this.service.createOrder(userId, dto);
  }

  @Get("orders")
  @ApiOperation({ summary: "注文一覧" })
  getOrders(@CurrentUser("id") userId: string) {
    return this.service.getOrders(userId);
  }

  @Get("series")
  @ApiOperation({ summary: "商品シリーズ一覧" })
  getSeries() {
    return this.service.getProductSeries();
  }

  @Post("series")
  @ApiOperation({ summary: "商品シリーズ作成" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  createSeries(@Body("name") name: string) {
    return this.service.createProductSeries(name);
  }
}
