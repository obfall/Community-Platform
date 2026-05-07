import { HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { CacheService } from "@/cache/cache.service";
import { BusinessException } from "@/common/exceptions/business.exception";
import { ErrorCode } from "@community-platform/shared";
import type { CreateLocaleDto, UpdateLocaleDto } from "./dto";

const CACHE_KEY = "master:locales:all";
const CACHE_PREFIX = "master:locales:";
const CACHE_TTL_SEC = 60 * 60;

@Injectable()
export class LocalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  findAll() {
    return this.cache.getOrSet(
      CACHE_KEY,
      () =>
        this.prisma.locale.findMany({
          orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        }),
      CACHE_TTL_SEC,
    );
  }

  async findOne(code: string) {
    const locale = await this.prisma.locale.findUnique({ where: { code } });
    if (!locale) throw new NotFoundException("ロケールが見つかりません");
    return locale;
  }

  async create(dto: CreateLocaleDto) {
    const exists = await this.prisma.locale.findUnique({ where: { code: dto.code } });
    if (exists) {
      throw new BusinessException(
        ErrorCode.LOCALE_ALREADY_EXISTS,
        HttpStatus.CONFLICT,
        `ロケール "${dto.code}" は既に存在します`,
      );
    }

    // is_default は同時に1つだけなので、true を立てる場合は他を全部 false に。
    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.locale.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.locale.create({ data: dto });
    });

    await this.cache.invalidate(CACHE_PREFIX);
    return created;
  }

  async update(code: string, dto: UpdateLocaleDto) {
    await this.findOne(code);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.locale.updateMany({
          where: { isDefault: true, NOT: { code } },
          data: { isDefault: false },
        });
      }
      return tx.locale.update({ where: { code }, data: dto });
    });

    await this.cache.invalidate(CACHE_PREFIX);
    return updated;
  }

  async remove(code: string) {
    const locale = await this.findOne(code);
    if (locale.isDefault) {
      throw new BusinessException(
        ErrorCode.LOCALE_DEFAULT_REQUIRED,
        HttpStatus.BAD_REQUEST,
        "既定ロケールは削除できません。先に別のロケールを既定に設定してください",
      );
    }

    await this.prisma.locale.delete({ where: { code } });
    await this.cache.invalidate(CACHE_PREFIX);
  }
}
