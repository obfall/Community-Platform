import { prisma } from "./demo/helpers/prisma-client";
import { runDemoSeed } from "./demo/index";

runDemoSeed(prisma)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
