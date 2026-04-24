import type {
  PrismaClient,
  PublishStatus,
  ProductSaleStatus,
  ProductSellerType,
  OrderStatus,
  ReservationStatus,
} from "@prisma/client";
import { pick, pickMany, randInt, rand } from "../helpers/random";
import { daysAgo, daysAhead, hoursAgo } from "../helpers/dates";

interface UserSummary {
  id: string;
  email: string;
  role: string;
  status: string;
}

const PRODUCT_SERIES = [
  { name: "オリジナルグッズ" },
  { name: "書籍・資料" },
  { name: "イベントチケット" },
];

interface ProductDef {
  name: string;
  price: number;
  stock: number | null;
  sellerType: ProductSellerType;
  publishStatus: PublishStatus;
  saleStatus: ProductSaleStatus;
  seriesIdx: number;
}

const PRODUCTS: ProductDef[] = [
  // 在庫あり・公開 × 10
  ...Array.from({ length: 10 }, (_, i) => ({
    name: `オリジナルTシャツ Vol.${i + 1}`,
    price: 2500 + i * 500,
    stock: randInt(10, 100),
    sellerType: (i % 3 === 0 ? "member" : "admin") as ProductSellerType,
    publishStatus: "published" as PublishStatus,
    saleStatus: "on_sale" as ProductSaleStatus,
    seriesIdx: 0,
  })),
  // 残り僅か × 3
  ...Array.from({ length: 3 }, (_, i) => ({
    name: `限定書籍 ${i + 1}`,
    price: 3800 + i * 200,
    stock: randInt(1, 5),
    sellerType: "admin" as ProductSellerType,
    publishStatus: "published" as PublishStatus,
    saleStatus: "on_sale" as ProductSaleStatus,
    seriesIdx: 1,
  })),
  // 在庫切れ × 2
  {
    name: "完売商品 A",
    price: 5000,
    stock: 0,
    sellerType: "admin",
    publishStatus: "published",
    saleStatus: "sold_out",
    seriesIdx: 0,
  },
  {
    name: "完売商品 B",
    price: 3000,
    stock: 0,
    sellerType: "member",
    publishStatus: "published",
    saleStatus: "sold_out",
    seriesIdx: 0,
  },
  // 下書き × 2
  {
    name: "【下書き】新商品企画A",
    price: 2000,
    stock: 50,
    sellerType: "admin",
    publishStatus: "draft",
    saleStatus: "on_sale",
    seriesIdx: 0,
  },
  {
    name: "【下書き】新商品企画B",
    price: 1500,
    stock: 30,
    sellerType: "admin",
    publishStatus: "draft",
    saleStatus: "on_sale",
    seriesIdx: 1,
  },
  // 非公開 × 2
  {
    name: "【公開停止】旧商品 A",
    price: 4500,
    stock: 20,
    sellerType: "admin",
    publishStatus: "unpublished",
    saleStatus: "on_sale",
    seriesIdx: 0,
  },
  {
    name: "【公開停止】旧商品 B",
    price: 6000,
    stock: 10,
    sellerType: "admin",
    publishStatus: "unpublished",
    saleStatus: "on_sale",
    seriesIdx: 2,
  },
  // イベントチケット販売
  {
    name: "特別イベントチケット",
    price: 8000,
    stock: 40,
    sellerType: "admin",
    publishStatus: "published",
    saleStatus: "on_sale",
    seriesIdx: 2,
  },
];

const ALBUM_TITLES = [
  "2025 夏合宿",
  "年末パーティー",
  "四半期総会",
  "会員旅行アルバム",
  "設立記念日",
];

const VENUES = [
  { name: "本部施設", types: ["office", "meeting_room"], capacity: 100 },
  { name: "サブスペース", types: ["studio", "meeting_room"], capacity: 30 },
  { name: "オンライン会場（バーチャル）", types: ["virtual"], capacity: 200 },
];

const CONTENT_TITLES = [
  { name: "会員向けお知らせまとめ", type: "article" },
  { name: "イベント実施報告", type: "article" },
  { name: "会員インタビュー", type: "article" },
  { name: "運営レポート 2025Q1", type: "report" },
  { name: "運営レポート 2025Q2", type: "report" },
  { name: "【下書き】新コンテンツ", type: "article" },
  { name: "プレミアム限定コラム", type: "article" },
  { name: "月刊アーカイブ 1月号", type: "article" },
  { name: "月刊アーカイブ 2月号", type: "article" },
  { name: "【非公開】内部資料", type: "report" },
];

async function getDemoUsers(prisma: PrismaClient): Promise<UserSummary[]> {
  return await prisma.user.findMany({
    where: { email: { endsWith: "@test.com" } },
    select: { id: true, email: true, role: true, status: true },
    orderBy: { createdAt: "asc" },
  });
}

async function seedShop(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const admin = users.find((u) => u.role === "admin");
  const activeMembers = users.filter((u) => u.status === "active" && u.role === "member");
  if (!admin) return;

  await prisma.shopSetting.create({
    data: {
      publishStatus: "published",
      autoTranslate: false,
      updatedByUserId: admin.id,
    },
  });

  const seriesIds: string[] = [];
  for (const [i, s] of PRODUCT_SERIES.entries()) {
    const ps = await prisma.productSeries.create({
      data: { name: s.name, sortOrder: i },
      select: { id: true },
    });
    seriesIds.push(ps.id);
  }

  const productIds: string[] = [];
  const productSellerMap = new Map<string, string>();
  for (const [idx, def] of PRODUCTS.entries()) {
    const seller = def.sellerType === "member" ? pick(activeMembers) : admin;
    const product = await prisma.product.create({
      data: {
        seriesId: seriesIds[def.seriesIdx]!,
        sellerUserId: seller.id,
        name: def.name,
        description: `${def.name}の詳細説明です。数量限定でお届けします。`,
        price: def.price,
        compareAtPrice: def.price < 5000 ? def.price + 500 : null,
        stock: def.stock,
        sellerType: def.sellerType,
        publishStatus: def.publishStatus,
        status: def.saleStatus,
        salesCount: def.saleStatus === "sold_out" ? randInt(10, 50) : randInt(0, 20),
      },
      select: { id: true },
    });
    productIds.push(product.id);
    productSellerMap.set(product.id, seller.id);

    // ProductImage (create a file + image)
    const imageFile = await prisma.file.create({
      data: {
        uploadedByUserId: seller.id,
        originalName: `product-${idx}.jpg`,
        storageKey: `demo/product/${product.id}-main.jpg`,
        storageBucket: process.env.R2_BUCKET ?? "demo-local",
        contentType: "image/jpeg",
        fileSizeBytes: BigInt(204800),
        fileCategory: "image",
        isPublic: true,
        publicUrl: `https://picsum.photos/seed/product-${idx}/600/600`,
        imageWidth: 600,
        imageHeight: 600,
      },
      select: { id: true },
    });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        fileId: imageFile.id,
        sortOrder: 0,
        isPrimary: true,
      },
    });
  }

  // Orders (aim ~30)
  const orderDefs: Array<{ status: OrderStatus; count: number }> = [
    { status: "in_progress", count: 8 },
    { status: "in_negotiation", count: 3 },
    { status: "completed", count: 15 },
    { status: "canceled", count: 4 },
  ];

  const publishedProductIds = productIds.slice(0, 13); // on_sale / published
  let orderCounter = 1;

  for (const def of orderDefs) {
    for (let i = 0; i < def.count; i++) {
      const buyer = pick(activeMembers);
      const productId = pick(publishedProductIds);
      const seller = productSellerMap.get(productId)!;
      if (seller === buyer.id) continue;

      const itemCount = randInt(1, 3);
      const itemProductIds = pickMany(publishedProductIds, itemCount);
      const items = await Promise.all(
        itemProductIds.map(async (pid) => {
          const p = await prisma.product.findUnique({
            where: { id: pid },
            select: { name: true, price: true, sellerUserId: true },
          });
          return { pid, name: p!.name, price: p!.price, sellerUserId: p!.sellerUserId };
        }),
      );
      const filteredItems = items.filter((it) => it.sellerUserId === seller);
      if (filteredItems.length === 0) continue;

      const totalAmount = filteredItems.reduce((sum, it) => sum + it.price * 1, 0);

      const order = await prisma.order.create({
        data: {
          buyerUserId: buyer.id,
          sellerUserId: seller,
          orderNumber: `DEMO-${Date.now().toString(36)}-${orderCounter++}`,
          totalAmount,
          status: def.status,
          notes: def.status === "in_negotiation" ? "商品の状態について相談中。" : null,
          completedAt: def.status === "completed" ? daysAgo(randInt(1, 30)) : null,
          canceledAt: def.status === "canceled" ? daysAgo(randInt(1, 20)) : null,
          createdAt: daysAgo(randInt(1, 60)),
        },
        select: { id: true },
      });

      for (const it of filteredItems) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: it.pid,
            productName: it.name,
            quantity: 1,
            unitPrice: it.price,
            subtotal: it.price,
          },
        });
      }
    }
  }
}

async function seedAlbums(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const admin = users.find((u) => u.role === "admin");
  const activeUsers = users.filter((u) => u.status === "active");
  if (!admin) return;
  const tags = await prisma.tag.findMany({
    where: { slug: { startsWith: "demo-" } },
    select: { id: true },
    take: 5,
  });

  for (const [idx, title] of ALBUM_TITLES.entries()) {
    const album = await prisma.album.create({
      data: {
        title,
        description: `${title}のアルバムです。`,
        coverPhotoUrl: `https://picsum.photos/seed/album-${idx}/800/600`,
        publishStatus: idx === 4 ? "draft" : "published",
        sortOrder: idx,
        createdByUserId: admin.id,
      },
      select: { id: true },
    });

    // Photos (10 per album)
    const photoCount = randInt(8, 12);
    for (let p = 0; p < photoCount; p++) {
      const uploader = pick(activeUsers);
      const file = await prisma.file.create({
        data: {
          uploadedByUserId: uploader.id,
          originalName: `album-${idx}-photo-${p}.jpg`,
          storageKey: `demo/album/${album.id}-${p}.jpg`,
          storageBucket: process.env.R2_BUCKET ?? "demo-local",
          contentType: "image/jpeg",
          fileSizeBytes: BigInt(307200),
          fileCategory: "image",
          isPublic: true,
          publicUrl: `https://picsum.photos/seed/album-${idx}-${p}/800/600`,
          imageWidth: 800,
          imageHeight: 600,
        },
        select: { id: true },
      });
      await prisma.albumPhoto.create({
        data: {
          albumId: album.id,
          fileId: file.id,
          caption: `${title}の一枚`,
          sortOrder: p,
          uploadedByUserId: uploader.id,
        },
      });
    }

    await prisma.album.update({
      where: { id: album.id },
      data: { photoCount },
    });

    // Tags
    if (tags.length > 0) {
      const chosen = pickMany(tags, randInt(1, 3));
      await prisma.albumTag.createMany({
        data: chosen.map((t) => ({ albumId: album.id, tagId: t.id })),
        skipDuplicates: true,
      });
    }
  }
}

async function seedVenues(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const admin = users.find((u) => u.role === "admin");
  const activeMembers = users.filter((u) => u.status === "active");
  if (!admin) return;

  const spaceIds: string[] = [];

  for (const v of VENUES) {
    const venue = await prisma.venue.create({
      data: {
        name: v.name,
        address: v.types.includes("virtual") ? null : "東京都千代田区サンプル 1-1",
        description: `${v.name}の説明。`,
        venueTypes: v.types,
        capacity: v.capacity,
        publishStatus: "published",
        createdByUserId: admin.id,
      },
      select: { id: true },
    });

    // Venue images (2 per venue)
    if (!v.types.includes("virtual")) {
      for (let i = 0; i < 2; i++) {
        const file = await prisma.file.create({
          data: {
            uploadedByUserId: admin.id,
            originalName: `venue-${venue.id}-${i}.jpg`,
            storageKey: `demo/venue/${venue.id}-${i}.jpg`,
            storageBucket: process.env.R2_BUCKET ?? "demo-local",
            contentType: "image/jpeg",
            fileSizeBytes: BigInt(256000),
            fileCategory: "image",
            isPublic: true,
            publicUrl: `https://picsum.photos/seed/venue-${venue.id}-${i}/800/600`,
            imageWidth: 800,
            imageHeight: 600,
          },
          select: { id: true },
        });
        await prisma.venueImage.create({
          data: {
            venueId: venue.id,
            fileId: file.id,
            sortOrder: i,
            isPrimary: i === 0,
          },
        });
      }
    }

    // Spaces
    const spaceCount = v.types.includes("virtual") ? 1 : randInt(1, 3);
    for (let s = 0; s < spaceCount; s++) {
      const sp = await prisma.space.create({
        data: {
          venueId: venue.id,
          name: `${v.name} スペース${s + 1}`,
          description: "設備充実のスペース",
          capacity: Math.floor(v.capacity / 2),
          spaceTypes: v.types,
          isReservable: true,
          publishStatus: "published",
          sortOrder: s,
        },
        select: { id: true },
      });
      spaceIds.push(sp.id);
    }
  }

  // Reservations (15 total)
  const resDefs: Array<{ status: ReservationStatus; count: number }> = [
    { status: "pending", count: 3 },
    { status: "confirmed", count: 8 },
    { status: "canceled", count: 4 },
  ];

  for (const def of resDefs) {
    for (let i = 0; i < def.count; i++) {
      const startOffset = def.status === "confirmed" ? randInt(-15, 20) : randInt(1, 20);
      const startAt = startOffset >= 0 ? daysAhead(startOffset) : daysAgo(-startOffset);
      await prisma.reservation.create({
        data: {
          spaceId: pick(spaceIds),
          userId: pick(activeMembers).id,
          title: `予約 #${i + 1}`,
          startAt,
          endAt: new Date(startAt.getTime() + 2 * 60 * 60 * 1000),
          status: def.status,
          note: "ミーティング利用",
        },
      });
    }
  }
}

async function seedContents(prisma: PrismaClient, users: UserSummary[]): Promise<void> {
  const admin = users.find((u) => u.role === "admin");
  if (!admin) return;

  for (const [idx, c] of CONTENT_TITLES.entries()) {
    const isDraft = c.name.includes("下書き") || c.name.includes("非公開");
    await prisma.content.create({
      data: {
        name: c.name,
        contentType: c.type,
        description: `${c.name} の説明`,
        price: idx % 4 === 0 ? randInt(500, 3000) : null,
        coverImageUrl: `https://picsum.photos/seed/content-${idx}/800/400`,
        inviteToken: `demo-content-token-${idx}-${Date.now().toString(36)}`,
        publishStatus: isDraft
          ? c.name.includes("非公開")
            ? "unpublished"
            : "draft"
          : "published",
        createdByUserId: admin.id,
      },
    });
  }
}

export async function seedCommerce(prisma: PrismaClient): Promise<void> {
  const users = await getDemoUsers(prisma);
  if (users.length === 0) {
    console.log("  [07-commerce] no demo users; skipping");
    return;
  }

  console.log("  [07-commerce] shop (settings / series / products / images / orders)");
  await seedShop(prisma, users);

  console.log("  [07-commerce] albums (albums / photos / tags)");
  await seedAlbums(prisma, users);

  console.log("  [07-commerce] venues (venues / images / spaces / reservations)");
  await seedVenues(prisma, users);

  console.log("  [07-commerce] contents");
  await seedContents(prisma, users);

  console.log("  [07-commerce] done");
}
