import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaService } from "./prisma/prisma.service";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
          },
        },
      ],
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  describe("getHealth", () => {
    it("should return health status", () => {
      const result = appController.getHealth();
      expect(result).toHaveProperty("status", "ok");
      expect(result).toHaveProperty("timestamp");
    });
  });
});
