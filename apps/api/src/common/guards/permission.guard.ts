import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "@/prisma/prisma.service";
import {
  REQUIRES_PERMISSION_KEY,
  type RequiresPermissionMeta,
} from "../decorators/requires-permission.decorator";

const DEFAULT_ALLOWED_ROLES = ["owner", "admin"];

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<RequiresPermissionMeta>(REQUIRES_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!meta) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role: string } | undefined;
    if (!user) throw new ForbiddenException("認証が必要です");

    const setting = await this.prisma.permissionSetting.findUnique({
      where: { featureKey_action: { featureKey: meta.featureKey, action: meta.action } },
      select: { allowedRoles: true },
    });

    const allowedRoles = (setting?.allowedRoles as string[] | undefined) ?? DEFAULT_ALLOWED_ROLES;
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException("この操作を行う権限がありません");
    }
    return true;
  }
}
