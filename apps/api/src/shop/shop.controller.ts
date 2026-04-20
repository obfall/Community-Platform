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
import { RequiresPermission } from "@/common/decorators/requires-permission.decorator";
import { RolesGuard, FeatureEnabledGuard, PermissionGuard } from "@/common/guards";
import { ShopService } from "./shop.service";
import { CreateProductDto, ProductQueryDto, CreateOrderDto, UpdateOrderStatusDto } from "./dto";

interface RequestUser {
  id: string;
  role: string;
}

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

  @Get("capabilities")
  @ApiOperation({ summary: "現在のユーザーの出品・管理可否" })
  getCapabilities(@CurrentUser() user: RequestUser) {
    return this.service.getShopCapabilities(user.role);
  }

  @Get("products/:id")
  @ApiOperation({ summary: "商品詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOneProduct(id);
  }

  @Post("products")
  @ApiOperation({ summary: "商品登録" })
  @UseGuards(PermissionGuard)
  @RequiresPermission("ec_shop", "create_product")
  create(@CurrentUser("id") userId: string, @Body() dto: CreateProductDto) {
    return this.service.createProduct(userId, dto);
  }

  @Patch("products/:id")
  @ApiOperation({ summary: "商品更新（出品者本人 or 全体管理権限）" })
  update(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: Partial<CreateProductDto> & { publishStatus?: string },
  ) {
    return this.service.updateProduct(user.id, user.role, id, data);
  }

  @Delete("products/:id")
  @ApiOperation({ summary: "商品削除（出品者本人 or 全体管理権限）" })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: RequestUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.service.removeProduct(user.id, user.role, id);
  }

  @Post("orders")
  @ApiOperation({ summary: "注文作成" })
  createOrder(@CurrentUser("id") userId: string, @Body() dto: CreateOrderDto) {
    return this.service.createOrder(userId, dto);
  }

  @Get("orders")
  @ApiOperation({ summary: "注文一覧（自分が買い手/販売者のもの）" })
  getOrders(@CurrentUser("id") userId: string) {
    return this.service.getOrders(userId);
  }

  @Get("orders/:id")
  @ApiOperation({ summary: "注文詳細" })
  getOrder(@CurrentUser() user: RequestUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.service.getOrder(id, user.id, user.role);
  }

  @Patch("orders/:id/status")
  @ApiOperation({
    summary: "注文ステータス更新（販売者 or 管理者、買い手は in_progress からのキャンセルのみ）",
  })
  updateOrderStatus(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.updateOrderStatus(id, user.id, user.role, dto.status);
  }

  @Get("seller/products")
  @ApiOperation({ summary: "販売者の商品一覧（自分の出品のみ）" })
  getSellerProducts(@CurrentUser("id") userId: string, @Query() query: ProductQueryDto) {
    return this.service.findAllProducts(query, userId);
  }

  @Get("seller/orders")
  @ApiOperation({ summary: "販売者の注文一覧（自分宛のみ）" })
  getSellerOrders(
    @CurrentUser("id") userId: string,
    @Query("status") status?: "in_progress" | "in_negotiation" | "completed" | "canceled",
  ) {
    return this.service.getSellerOrders(userId, status);
  }

  @Get("seller/summary")
  @ApiOperation({ summary: "販売者サマリー（売上合計・件数）" })
  getSellerSummary(
    @CurrentUser("id") userId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.service.getSellerSummary(
      userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get("categories")
  @ApiOperation({ summary: "商品カテゴリ一覧" })
  getCategories() {
    return this.service.getProductCategories();
  }

  @Post("categories")
  @ApiOperation({ summary: "商品カテゴリ作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  createCategory(@Body("name") name: string) {
    return this.service.createProductCategory(name);
  }

  @Get("series")
  @ApiOperation({ summary: "商品シリーズ一覧" })
  getSeries() {
    return this.service.getProductSeries();
  }

  @Post("series")
  @ApiOperation({ summary: "商品シリーズ作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  createSeries(@Body("name") name: string) {
    return this.service.createProductSeries(name);
  }
}
