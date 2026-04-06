import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/prisma/prisma.service";
import { StorageService } from "@/files/storage/storage.service";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpeg = require("fluent-ffmpeg");
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

@Injectable()
export class VideoProcessorService {
  private readonly logger = new Logger(VideoProcessorService.name);
  private readonly ffmpegPath: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {
    // FFmpeg パスを設定（環境変数で上書き可能）
    this.ffmpegPath = config.get<string>("FFMPEG_PATH") ?? "ffmpeg";
  }

  /**
   * 動画ファイルを HLS に変換して MinIO/R2 にアップロード
   */
  async processVideo(videoId: string, inputBuffer: Buffer, originalName: string): Promise<void> {
    const tmpDir = path.join(os.tmpdir(), `hls-${videoId}`);
    const inputPath = path.join(tmpDir, originalName);
    const outputDir = path.join(tmpDir, "hls");

    try {
      // ステータスを processing に
      await this.prisma.video.update({
        where: { id: videoId },
        data: { streamStatus: "processing" },
      });

      // 一時ディレクトリ作成
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(inputPath, inputBuffer);

      // 動画の長さを取得
      const durationSeconds = await this.getVideoDuration(inputPath);

      // HLS に変換
      await this.convertToHls(inputPath, outputDir);

      // HLS ファイルを MinIO/R2 にアップロード
      const storagePrefix = `videos/${videoId}/hls`;
      const hlsFiles = this.getFilesRecursive(outputDir);

      for (const filePath of hlsFiles) {
        const relativePath = path.relative(outputDir, filePath).replace(/\\/g, "/");
        const storageKey = `${storagePrefix}/${relativePath}`;
        const fileBuffer = fs.readFileSync(filePath);
        const contentType = this.getContentType(filePath);

        await this.storage.upload(storageKey, fileBuffer, contentType);
      }

      // playbackUrl を設定
      const publicUrl = this.storage.getPublicUrl(`${storagePrefix}/playlist.m3u8`);

      // ステータスを ready に + 動画長を保存
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          streamStatus: "ready",
          playbackUrl: publicUrl,
          videoExternalId: storagePrefix,
          durationSeconds: durationSeconds ? Math.round(durationSeconds) : null,
        },
      });

      this.logger.log(`Video ${videoId} processed successfully`);
    } catch (error) {
      this.logger.error(`Video ${videoId} processing failed:`, error);
      await this.prisma.video.update({
        where: { id: videoId },
        data: { streamStatus: "error" },
      });
    } finally {
      // 一時ファイル削除
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  private getVideoDuration(inputPath: string): Promise<number | null> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(
        inputPath,
        (err: Error | null, metadata: { format: { duration?: number } }) => {
          if (err) {
            this.logger.warn("Could not get video duration:", err.message);
            resolve(null);
            return;
          }
          resolve(metadata.format.duration ?? null);
        },
      );
    });
  }

  private convertToHls(inputPath: string, outputDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setFfmpegPath(this.ffmpegPath)
        .outputOptions([
          "-codec: copy",
          "-start_number 0",
          "-hls_time 10",
          "-hls_list_size 0",
          "-f hls",
        ])
        .output(path.join(outputDir, "playlist.m3u8"))
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .run();
    });
  }

  private getFilesRecursive(dir: string): string[] {
    const files: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.getFilesRecursive(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    return files;
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case ".m3u8":
        return "application/vnd.apple.mpegurl";
      case ".ts":
        return "video/mp2t";
      default:
        return "application/octet-stream";
    }
  }
}
