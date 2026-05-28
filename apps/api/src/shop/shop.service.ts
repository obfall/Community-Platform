import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { CacheService } from "@/cache/cache.service";
import { NotificationsService } from "@/notifications/notifications.service";
import {
  buildPaginationMeta,
  escapePgroongaQuery,
  extractPagination,
  pgroongaSearchAndFetch,
} from "@/common/utils";

const PRODUCT_CATEGORIES_CACHE_KEY = "master:categories:product:all";
const PRODUCT_CATEGORIES_CACHE_PREFIX = "master:categories:product:";
const CATEGORIES_CACHE_TTL_SEC = 60 * 60;
import { Prisma } from "@prisma/client";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { ProductQueryDto } from "./dto/product-query.dto";
import type { CreateOrderDto } from "./dto/create-order.dto";
import type { OrderStatusValue } from "./dto/update-order-status.dto";

const ALLOWED_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  in_progress: ["in_negotiation", "canceled"],
  in_negotiation: ["completed", "canceled"],
  completed: [],
  canceled: [],
};

// ステータス遷移に伴う通知テンプレ（in_progress はターゲットにならない＝通知不要）
const STATUS_NOTIFICATION_TEMPLATES: Partial<
  Record<
    OrderStatusValue,
    { type: string; title: string; body: (actor: string, products: string) => string }
  >
> = {
  in_negotiation: {
    type: "shop_order_negotiating",
    title: "取引が開始されました",
    body: (actor, products) => `${actor}さんが『${products}』の取引を開始しました`,
  },
  completed: {
    type: "shop_order_completed",
    title: "取引が完了しました",
    body: (actor, products) => `${actor}さんが『${products}』の取引を完了しました`,
  },
  canceled: {
    type: "shop_order_canceled",
    title: "注文がキャンセルされました",
    body: (actor, products) => `${actor}さんが『${products}』の注文をキャンセルしました`,
  },
};

const DEFAULT_SHOP_ROLES = {
  create_product: ["owner", "admin", "member"],
  manage_all_products: ["owner", "admin"],
} as const satisfies Record<string, readonly string[]>;

type ShopAction = keyof typeof DEFAULT_SHOP_ROLES;

@Injectable()
export class ShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly cache: CacheService,
  ) {}

  // --- 権限 ---

  async getShopCapabilities(userRole: string) {
    const settings = await this.prisma.permissionSetting.findMany({
      where: { featureKey: "ec_shop" },
      select: { action: true, allowedRoles: true },
    });
    const check = (action: ShopAction) => {
      const row = settings.find((s) => s.action === action);
      const roles = (row?.allowedRoles as string[] | undefined) ?? [...DEFAULT_SHOP_ROLES[action]];
      return roles.includes(userRole);
    };
    return {
      canCreateProduct: check("create_product"),
      canManageAllProducts: check("manage_all_products"),
    };
  }

  private async canManageAll(userRole: string): Promise<boolean> {
    const setting = await this.prisma.permissionSetting.findUnique({
      where: { featureKey_action: { featureKey: "ec_shop", action: "manage_all_products" } },
      select: { allowedRoles: true },
    });
    const roles = (setting?.allowedRoles as string[] | undefined) ?? [
      ...DEFAULT_SHOP_ROLES.manage_all_products,
    ];
    return roles.includes(userRole);
  }

  // --- 商品 ---

  async findAllProducts(query: ProductQueryDto, sellerUserId?: string) {
    const escaped = query.search ? escapePgroongaQuery(query.search) : "";
    if (escaped) {
      return this.searchProductsByPgroonga(query, escaped, sellerUserId);
    }
    return this.findAllProductsStandard(query, sellerUserId);
  }

  private async findAllProductsStandard(query: ProductQueryDto, sellerUserId?: string) {
    const { page, limit, skip } = extractPagination(query);

    const where: Prisma.ProductWhereInput = { deletedAt: null };
    if (query.publishStatus && query.publishStatus !== "all")
      where.publishStatus = query.publishStatus as "draft" | "published" | "unpublished";
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.seriesId) where.seriesId = query.seriesId;
    if (sellerUserId) where.sellerUserId = sellerUserId;
    if (query.hideExpired) {
      where.OR = [{ saleEndAt: null }, { saleEndAt: { gte: new Date() } }];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: this.productListInclude(),
      }),
      this.prisma.product.count({ where }),
    ]);

    return this.formatProductList(data, total, page, limit);
  }

  /** pgroonga による全文検索版。検索条件は通常一覧と一致させる（下書き含む）。 */
  private async searchProductsByPgroonga(
    query: ProductQueryDto,
    escaped: string,
    sellerUserId?: string,
  ) {
    const { page, limit, offset } = extractPagination(query);

    const where = Prisma.sql`
      deleted_at IS NULL
      ${query.publishStatus && query.publishStatus !== "all" ? Prisma.sql`AND publish_status = ${query.publishStatus}::"PublishStatus"` : Prisma.empty}
      ${query.categoryId ? Prisma.sql`AND category_id = ${query.categoryId}::uuid` : Prisma.empty}
      ${query.seriesId ? Prisma.sql`AND series_id = ${query.seriesId}::uuid` : Prisma.empty}
      ${sellerUserId ? Prisma.sql`AND seller_user_id = ${sellerUserId}::uuid` : Prisma.empty}
      ${query.hideExpired ? Prisma.sql`AND (sale_end_at IS NULL OR sale_end_at >= NOW())` : Prisma.empty}
    `;

    const { records, hitsById, total } = await pgroongaSearchAndFetch({
      prisma: this.prisma,
      table: "products",
      searchColumns: ["name", "description"],
      titleColumn: "name",
      snippetColumn: "description",
      escaped,
      where,
      limit,
      offset,
      fetchByIds: (ids) =>
        this.prisma.product.findMany({
          where: { id: { in: ids }, deletedAt: null },
          include: this.productListInclude(),
        }),
    });

    return this.formatProductList(records, total, page, limit, hitsById);
  }

  private productListInclude() {
    return {
      category: { select: { id: true, name: true } },
      series: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      images: {
        where: { isPrimary: true },
        take: 1,
        include: { file: { select: { publicUrl: true } } },
      },
    } satisfies Prisma.ProductInclude;
  }

  private formatProductList(
    data: Array<
      Prisma.ProductGetPayload<{ include: ReturnType<ShopService["productListInclude"]> }>
    >,
    total: number,
    page: number,
    limit: number,
    hitsById?: Map<string, { titleHighlighted: string; snippetHighlighted: string }>,
  ) {
    return {
      data: data.map((p) => {
        const h = hitsById?.get(p.id);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          titleHighlighted: h?.titleHighlighted,
          snippetHighlighted: h?.snippetHighlighted,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          stock: p.stock,
          publishStatus: p.publishStatus,
          status: p.status,
          salesCount: p.salesCount,
          imageUrl: p.images[0]?.file.publicUrl ?? null,
          category: p.category,
          series: p.series,
          seller: p.seller,
          saleStartAt: p.saleStartAt,
          saleEndAt: p.saleEndAt,
          createdAt: p.createdAt,
        };
      }),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOneProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        series: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        images: {
          orderBy: { sortOrder: "asc" },
          include: { file: { select: { id: true, publicUrl: true, originalName: true } } },
        },
      },
    });
    if (!product || product.deletedAt) throw new NotFoundException("商品が見つかりません");
    return product;
  }

  async createProduct(userId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        stock: dto.stock,
        categoryId: dto.categoryId,
        seriesId: dto.seriesId,
        saleStartAt: dto.saleStartAt ? new Date(dto.saleStartAt) : undefined,
        saleEndAt: dto.saleEndAt ? new Date(dto.saleEndAt) : undefined,
        ...(dto.publishStatus && {
          publishStatus: dto.publishStatus as "draft" | "published" | "unpublished",
        }),
        sellerUserId: userId,
        ...(dto.imageFileIds &&
          dto.imageFileIds.length > 0 && {
            images: {
              create: dto.imageFileIds.map((fileId, i) => ({
                fileId,
                sortOrder: i,
                isPrimary: i === 0,
              })),
            },
          }),
      },
    });
  }

  async updateProduct(
    userId: string,
    userRole: string,
    id: string,
    data: Partial<CreateProductDto> & {
      publishStatus?: string;
      saleStartAt?: string | null;
      saleEndAt?: string | null;
      imageFileIds?: string[];
    },
  ) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product || product.deletedAt) throw new NotFoundException("商品が見つかりません");

    const isOwner = product.sellerUserId === userId;
    const canManageAll = await this.canManageAll(userRole);
    if (!isOwner && !canManageAll) {
      throw new ForbiddenException("この商品を編集する権限がありません");
    }

    if (data.imageFileIds !== undefined) {
      await this.prisma.productImage.deleteMany({ where: { productId: id } });
      if (data.imageFileIds.length > 0) {
        await this.prisma.productImage.createMany({
          data: data.imageFileIds.map((fileId, i) => ({
            productId: id,
            fileId,
            sortOrder: i,
            isPrimary: i === 0,
          })),
        });
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.compareAtPrice !== undefined && { compareAtPrice: data.compareAtPrice }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.seriesId !== undefined && { seriesId: data.seriesId }),
        ...(data.saleStartAt !== undefined && {
          saleStartAt: data.saleStartAt ? new Date(data.saleStartAt) : null,
        }),
        ...(data.saleEndAt !== undefined && {
          saleEndAt: data.saleEndAt ? new Date(data.saleEndAt) : null,
        }),
        ...(data.publishStatus !== undefined && {
          publishStatus: data.publishStatus as "draft" | "published" | "unpublished",
        }),
      },
    });
  }

  async removeProduct(userId: string, userRole: string, id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { sellerUserId: true, deletedAt: true },
    });
    if (!product || product.deletedAt) throw new NotFoundException("商品が見つかりません");

    const isOwner = product.sellerUserId === userId;
    const canManageAll = await this.canManageAll(userRole);
    if (!isOwner && !canManageAll) {
      throw new ForbiddenException("この商品を削除する権限がありません");
    }

    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // --- 注文 ---

  async createOrder(buyerUserId: string, dto: CreateOrderDto) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.items.map((i) => i.productId) }, deletedAt: null },
    });

    const now = new Date();
    const items = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new NotFoundException(`商品 ${item.productId} が見つかりません`);
      if (product.saleStartAt && product.saleStartAt > now) {
        throw new BadRequestException(`商品「${product.name}」はまだ販売開始前です`);
      }
      if (product.saleEndAt && product.saleEndAt < now) {
        throw new BadRequestException(`商品「${product.name}」は販売期間が終了しています`);
      }
      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal: product.price * item.quantity,
        sellerUserId: product.sellerUserId,
      };
    });

    const totalAmount = items.reduce((sum, i) => sum + i.subtotal, 0);
    const firstItem = items[0];
    if (!firstItem) throw new BadRequestException("注文アイテムがありません");
    const sellerUserId = firstItem.sellerUserId;
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const order = await this.prisma.order.create({
      data: {
        buyerUserId,
        sellerUserId,
        orderNumber,
        totalAmount,
        notes: dto.notes,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
          })),
        },
      },
      include: { items: true },
    });

    // 販売者に申込通知（失敗しても注文は成立させる）
    try {
      const buyer = await this.prisma.user.findUnique({
        where: { id: buyerUserId },
        select: { name: true },
      });
      const productNames = items.map((i) => i.productName).join("、");
      await this.notifications.create({
        userId: sellerUserId,
        type: "shop_order_requested",
        title: "商品の購入申込",
        body: `${buyer?.name ?? "ユーザー"}さんから『${productNames}』の購入申込がありました`,
        referenceType: "shop_order",
        referenceId: order.id,
        actorUserId: buyerUserId,
      });
    } catch {
      // 通知失敗は握りつぶす
    }

    return order;
  }

  async getOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { OR: [{ buyerUserId: userId }, { sellerUserId: userId }] },
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        items: true,
      },
    });
  }

  async getSellerOrders(sellerUserId: string, status?: OrderStatusValue) {
    return this.prisma.order.findMany({
      where: { sellerUserId, ...(status && { status }) },
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        items: true,
      },
    });
  }

  async getSellerSummary(sellerUserId: string, from?: Date, to?: Date) {
    const dateFilter: Prisma.OrderWhereInput = {
      sellerUserId,
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      }),
    };

    const [byStatus, completedAgg] = await Promise.all([
      this.prisma.order.groupBy({
        by: ["status"],
        where: dateFilter,
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: { ...dateFilter, status: "completed" },
        _sum: { totalAmount: true },
      }),
    ]);

    const counts = byStatus.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    return {
      totalRevenue: completedAgg._sum.totalAmount ?? 0,
      orderCount:
        (counts.in_progress ?? 0) +
        (counts.in_negotiation ?? 0) +
        (counts.completed ?? 0) +
        (counts.canceled ?? 0),
      inProgressCount: counts.in_progress ?? 0,
      inNegotiationCount: counts.in_negotiation ?? 0,
      completedCount: counts.completed ?? 0,
      canceledCount: counts.canceled ?? 0,
    };
  }

  // システム全体（manage_all_products 権限保持者向け）の注文一覧
  async getAllOrders(status?: OrderStatusValue) {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        items: true,
      },
    });
  }

  // システム全体の売上サマリー（販売者の絞り込み無し）
  async getSystemSummary(from?: Date, to?: Date) {
    const dateFilter: Prisma.OrderWhereInput =
      from || to
        ? {
            createdAt: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {};

    const [byStatus, completedAgg] = await Promise.all([
      this.prisma.order.groupBy({
        by: ["status"],
        where: dateFilter,
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: { ...dateFilter, status: "completed" },
        _sum: { totalAmount: true },
      }),
    ]);

    const counts = byStatus.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    return {
      totalRevenue: completedAgg._sum.totalAmount ?? 0,
      orderCount:
        (counts.in_progress ?? 0) +
        (counts.in_negotiation ?? 0) +
        (counts.completed ?? 0) +
        (counts.canceled ?? 0),
      inProgressCount: counts.in_progress ?? 0,
      inNegotiationCount: counts.in_negotiation ?? 0,
      completedCount: counts.completed ?? 0,
      canceledCount: counts.canceled ?? 0,
    };
  }

  async getOrder(orderId: string, userId: string, userRole: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        items: true,
      },
    });
    if (!order) throw new NotFoundException("注文が見つかりません");

    const isParticipant = order.buyerUserId === userId || order.sellerUserId === userId;
    const canManageAll = await this.canManageAll(userRole);
    if (!isParticipant && !canManageAll) {
      throw new ForbiddenException("この注文を閲覧する権限がありません");
    }
    return order;
  }

  async updateOrderStatus(
    orderId: string,
    userId: string,
    userRole: string,
    newStatus: OrderStatusValue,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        buyerUserId: true,
        sellerUserId: true,
        items: { select: { productId: true, quantity: true } },
      },
    });
    if (!order) throw new NotFoundException("注文が見つかりません");

    const isSeller = order.sellerUserId === userId;
    const isBuyer = order.buyerUserId === userId;
    const canManageAll = await this.canManageAll(userRole);

    // 販売者 or 全体管理権限 or 買い手（ただし in_progress からのキャンセルのみ）
    const buyerMayCancel = isBuyer && order.status === "in_progress" && newStatus === "canceled";
    if (!isSeller && !canManageAll && !buyerMayCancel) {
      throw new ForbiddenException("この注文のステータスを変更する権限がありません");
    }

    const allowed = ALLOWED_TRANSITIONS[order.status as OrderStatusValue];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `このステータスからの遷移はできません (${order.status} → ${newStatus})`,
      );
    }

    const completedAt = newStatus === "completed" ? new Date() : undefined;
    const canceledAt = newStatus === "canceled" ? new Date() : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          ...(completedAt && { completedAt }),
          ...(canceledAt && { canceledAt }),
        },
        include: {
          buyer: { select: { id: true, name: true } },
          seller: { select: { id: true, name: true } },
          items: true,
        },
      });

      if (newStatus === "completed") {
        await Promise.all(
          order.items.map((item) =>
            tx.product.update({
              where: { id: item.productId },
              data: { salesCount: { increment: item.quantity } },
            }),
          ),
        );
      }

      return result;
    });

    // 通知（失敗は握りつぶす）— トランザクション外で送信
    await this.sendOrderStatusChangeNotification(updated, userId, newStatus);

    return updated;
  }

  private async sendOrderStatusChangeNotification(
    updated: {
      id: string;
      buyer: { id: string; name: string };
      seller: { id: string; name: string };
      items: Array<{ productName: string }>;
    },
    actorUserId: string,
    newStatus: OrderStatusValue,
  ) {
    const template = STATUS_NOTIFICATION_TEMPLATES[newStatus];
    if (!template) return;

    try {
      // 行為者本人以外の当事者（買い手・販売者）に通知。
      // 管理者が当事者でない場合は両者へ。
      const recipients: string[] = [];
      if (actorUserId !== updated.buyer.id) recipients.push(updated.buyer.id);
      if (actorUserId !== updated.seller.id) recipients.push(updated.seller.id);
      if (recipients.length === 0) return;

      const actorName =
        actorUserId === updated.buyer.id
          ? updated.buyer.name
          : actorUserId === updated.seller.id
            ? updated.seller.name
            : "管理者";
      const productNames = updated.items.map((i) => i.productName).join("、");

      await Promise.all(
        recipients.map((recipientUserId) =>
          this.notifications.create({
            userId: recipientUserId,
            type: template.type,
            title: template.title,
            body: template.body(actorName, productNames),
            referenceType: "shop_order",
            referenceId: updated.id,
            actorUserId,
          }),
        ),
      );
    } catch {
      // 通知失敗は握りつぶす（createOrder と同じ方針）
    }
  }

  // --- カテゴリ ---

  async getProductCategories() {
    return this.cache.getOrSet(
      PRODUCT_CATEGORIES_CACHE_KEY,
      () =>
        this.prisma.category.findMany({
          where: { scope: "product", isActive: true },
          orderBy: { sortOrder: "asc" },
        }),
      CATEGORIES_CACHE_TTL_SEC,
    );
  }

  async createProductCategory(name: string) {
    const slug = `product-${Date.now()}`;
    const created = await this.prisma.category.create({
      data: { scope: "product", slug, name },
    });
    await this.cache.invalidate(PRODUCT_CATEGORIES_CACHE_PREFIX);
    return created;
  }

  // --- シリーズ ---

  async getProductSeries() {
    return this.prisma.productSeries.findMany({ orderBy: { sortOrder: "asc" } });
  }

  async createProductSeries(name: string) {
    return this.prisma.productSeries.create({ data: { name } });
  }
}
