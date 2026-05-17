import { HttpStatus } from "@nestjs/common";
import { ErrorCode } from "@community-platform/shared";
import { BusinessException } from "@/common/exceptions";
import { VideosController } from "./videos.controller";
import type { VideosService } from "./videos.service";
import type { VideoProcessorService } from "./video-processor.service";

describe("VideosController", () => {
  let serviceMock: Partial<Record<keyof VideosService, jest.Mock>>;
  let processorMock: { processVideo: jest.Mock };
  let controller: VideosController;

  beforeEach(() => {
    serviceMock = {
      createForUpload: jest.fn().mockResolvedValue({ id: "v-1" }),
      resetStreamForReplace: jest.fn().mockResolvedValue({ id: "v-1" }),
    };
    processorMock = { processVideo: jest.fn().mockResolvedValue(undefined) };
    controller = new VideosController(
      serviceMock as unknown as VideosService,
      processorMock as unknown as VideoProcessorService,
    );
  });

  describe("upload: 動画アップロード", () => {
    it("file が未指定なら BusinessException(VALIDATION_FAILED / errors.validation.video_file_required) を投げる", async () => {
      const promise = controller.upload(undefined as unknown as Express.Multer.File, "user-1", {
        title: "新規動画",
      });

      await expect(promise).rejects.toBeInstanceOf(BusinessException);
      await expect(promise).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_FAILED,
        messageKey: "errors.validation.video_file_required",
      });
    });

    it("file 未指定で投げる BusinessException は HTTP 400 を持つ", async () => {
      try {
        await controller.upload(undefined as unknown as Express.Multer.File, "user-1", {
          title: "新規動画",
        });
        fail("should have thrown");
      } catch (err) {
        expect((err as BusinessException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });

    it("file が指定されていれば service.createForUpload と processor.processVideo を呼ぶ", async () => {
      const file = {
        buffer: Buffer.from("video bytes"),
        originalname: "intro.mp4",
      } as unknown as Express.Multer.File;

      const result = await controller.upload(file, "user-1", { title: "新規動画" });

      expect(result).toEqual({ id: "v-1" });
      expect(serviceMock.createForUpload).toHaveBeenCalledWith("user-1", { title: "新規動画" });
      expect(processorMock.processVideo).toHaveBeenCalledWith("v-1", file.buffer, "intro.mp4");
    });
  });

  describe("replaceFile: 動画ファイル差し替え", () => {
    it("file が未指定なら BusinessException(video_file_required) を投げる", async () => {
      const promise = controller.replaceFile("v-1", undefined as unknown as Express.Multer.File);

      await expect(promise).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_FAILED,
        messageKey: "errors.validation.video_file_required",
      });
    });

    it("file が指定されていれば resetStreamForReplace を呼び processing ステータスを返す", async () => {
      const file = {
        buffer: Buffer.from("v2 bytes"),
        originalname: "replace.mp4",
      } as unknown as Express.Multer.File;

      const result = await controller.replaceFile("v-1", file);

      expect(serviceMock.resetStreamForReplace).toHaveBeenCalledWith("v-1");
      expect(processorMock.processVideo).toHaveBeenCalledWith("v-1", file.buffer, "replace.mp4");
      expect(result).toEqual({ id: "v-1", streamStatus: "processing" });
    });
  });
});
