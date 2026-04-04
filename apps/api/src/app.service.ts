import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  async getDetailedHealth() {
    let dbStatus = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "error";
    }

    return {
      status: dbStatus === "ok" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
      },
    };
  }
}
