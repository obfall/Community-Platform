import type { PrismaClient } from "@prisma/client";
import { getDemoPasswordHash } from "../helpers/hash";

export const E2E_USER_FIXTURES = [
  {
    email: "e2e-admin@test.com",
    name: "E2E Admin",
    role: "admin" as const,
    isAdmin: true,
  },
  {
    email: "e2e-owner@test.com",
    name: "E2E Owner",
    role: "owner" as const,
    isAdmin: false,
  },
  {
    email: "e2e-member@test.com",
    name: "E2E Member",
    role: "member" as const,
    isAdmin: false,
  },
];

export async function seedE2EUsers(prisma: PrismaClient): Promise<void> {
  const passwordHash = await getDemoPasswordHash();
  const defaultRank = await prisma.memberRank.findUnique({ where: { slug: "general" } });
  const now = new Date();

  for (const fixture of E2E_USER_FIXTURES) {
    const user = await prisma.user.create({
      data: {
        email: fixture.email,
        passwordHash,
        name: fixture.name,
        role: fixture.role,
        status: "active",
        isAdmin: fixture.isAdmin,
        isActive: true,
        rankId: fixture.role === "member" && defaultRank ? defaultRank.id : null,
        emailVerifiedAt: now,
        joinedAt: now,
        lastLoginAt: now,
      },
      select: { id: true },
    });

    await prisma.userProfile.create({
      data: {
        userId: user.id,
        allowDirectMessages: true,
      },
    });
  }
}
