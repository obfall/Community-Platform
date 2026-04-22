import { Injectable, CanActivate, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";

@Injectable()
export class RegistrationAllowedGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(): Promise<boolean> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: "allow_registration" },
      select: { value: true },
    });

    if (setting?.value === "false") {
      throw new ForbiddenException("現在新規登録を受け付けていません");
    }

    return true;
  }
}
