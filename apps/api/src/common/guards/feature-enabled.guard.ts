import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "@/prisma/prisma.service";
import { FEATURE_KEY } from "../decorators/feature-enabled.decorator";

@Injectable()
export class FeatureEnabledGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!featureKey) return true;

    const feature = await this.prisma.featureSetting.findUnique({
      where: { featureKey },
      select: { isEnabled: true },
    });

    if (!feature || !feature.isEnabled) {
      throw new ForbiddenException("この機能は現在無効です");
    }

    return true;
  }
}
