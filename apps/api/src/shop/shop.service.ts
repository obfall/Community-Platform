import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { ProductQueryDto } from "./dto/product-query.dto";
import type { CreateOrderDto } from "./dto/create-order.dto";

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  // --- 商品 ---

  async findAllProducts(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { deletedAt: null };
    if (query.publishStatus && query.publishStatus !== "all")
      where.publishStatus = query.publishStatus as "draft" | "published" | "archived";
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.seriesId) where.seriesId = query.seriesId;
    if (query.search) where.name = { contains: query.search, mode: "insensitive" };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          series: { select: { id: true, name: true } },
          seller: { select: { id: true, name: true } },
          images: {
            where: { isPrimary: true },
            take: 1,
            include: { file: { select: { publicUrl: true } } },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: data.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
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
        createdAt: p.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
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
          publishStatus: data.publishStatus as "draft" | "published" | "archived",
        }),
      },
    });
  }

  async removeProduct(id: string) {
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // --- 注文 ---

  async createOrder(buyerUserId: string, dto: CreateOrderDto) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.items.map((i) => i.productId) }, deletedAt: null },
    });

    const items = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new NotFoundException(`商品 ${item.productId} が見つかりません`);
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

    return this.prisma.order.create({
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

  // --- カテゴリ ---

  async getProductCategories() {
    return this.prisma.category.findMany({
      where: { scope: "product", isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createProductCategory(name: string) {
    const slug = `product-${Date.now()}`;
    return this.prisma.category.create({
      data: { scope: "product", slug, name },
    });
  }

  // --- シリーズ ---

  async getProductSeries() {
    return this.prisma.productSeries.findMany({ orderBy: { sortOrder: "asc" } });
  }

  async createProductSeries(name: string) {
    return this.prisma.productSeries.create({ data: { name } });
  }
}
