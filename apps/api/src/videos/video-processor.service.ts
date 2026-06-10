// TEMP: VIDEO_OUTPUT_FORMAT=mp4 (Cloudflare Stream 移行までの暫定)
// Railway 無料プランの OOM 回避のため、env で MP4 直配信に切替可能にしている。
// 詳細: docs/動画HLS変換のOOM障害と対策.md / docs/plans/videos/mp4-temporary-distribution.md
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/prisma/prisma.service";
import { StorageService } from "@/files/storage/storage.service";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpeg = require("fluent-ffmpeg");
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface VideoMetadata {
  duration: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
}

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
}

interface FfprobeMetadata {
  format: { duration?: number };
  streams: FfprobeStream[];
}

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
   * 動画ファイルを MP4 (default) または HLS に変換して MinIO/R2 にアップロード。
   * VIDEO_OUTPUT_FORMAT=hls で HLS 経路に切替（既存挙動）。
   * VideoProvider enum は `r2_hls` のまま流用し、実体は playbackUrl の拡張子で識別する。
   */
  async processVideo(videoId: string, inputBuffer: Buffer, originalName: string): Promise<void> {
    const tmpDir = path.join(os.tmpdir(), `hls-${videoId}`);
    const inputPath = path.join(tmpDir, originalName);
    const outputDir = path.join(tmpDir, "hls");
    // TEMP: VIDEO_OUTPUT_FORMAT=mp4 (Cloudflare Stream 移行までの暫定)
    const outputFormat = this.config.get<string>("VIDEO_OUTPUT_FORMAT") ?? "mp4";

    try {
      await this.prisma.video.update({
        where: { id: videoId },
        data: { streamStatus: "processing" },
      });

      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(inputPath, inputBuffer);

      const metadata = await this.getVideoMetadata(inputPath);

      // TEMP: VIDEO_OUTPUT_FORMAT=mp4 (Cloudflare Stream 移行までの暫定)
      if (outputFormat === "mp4") {
        // -c copy は H.264/AAC を前提とするため、不適合コーデックは事前に弾く
        if (metadata.videoCodec !== "h264" || metadata.audioCodec !== "aac") {
          this.logger.warn(
            `Video ${videoId} has unsupported codec for MP4 direct playback: video=${metadata.videoCodec}, audio=${metadata.audioCodec}`,
          );
          await this.prisma.video.update({
            where: { id: videoId },
            data: { streamStatus: "error" },
          });
          return;
        }

        const mp4StorageKey = `videos/${videoId}/source.mp4`;
        const mp4LocalPath = path.join(tmpDir, "source.mp4");

        await this.convertToMp4(inputPath, mp4LocalPath);
        const mp4Buffer = fs.readFileSync(mp4LocalPath);
        await this.storage.upload(mp4StorageKey, mp4Buffer, "video/mp4");

        const thumbnailUrl = await this.uploadThumbnail(
          videoId,
          inputPath,
          tmpDir,
          metadata.duration,
        );
        const publicUrl = this.storage.getPublicUrl(mp4StorageKey);

        await this.prisma.video.update({
          where: { id: videoId },
          data: {
            streamStatus: "ready",
            playbackUrl: publicUrl,
            videoExternalId: `videos/${videoId}`,
            durationSeconds: metadata.duration ? Math.round(metadata.duration) : null,
            thumbnailUrl,
          },
        });

        this.logger.log(`Video ${videoId} processed as MP4 direct distribution`);
        return;
      }

      // 既存 HLS 経路（VIDEO_OUTPUT_FORMAT=hls 時 / Cloudflare Stream 移行時はこちらが本流）
      await this.convertToHls(inputPath, outputDir);

      const storagePrefix = `videos/${videoId}/hls`;
      const hlsFiles = this.getFilesRecursive(outputDir);

      for (const filePath of hlsFiles) {
        const relativePath = path.relative(outputDir, filePath).replace(/\\/g, "/");
        const storageKey = `${storagePrefix}/${relativePath}`;
        const fileBuffer = fs.readFileSync(filePath);
        const contentType = this.getContentType(filePath);

        await this.storage.upload(storageKey, fileBuffer, contentType);
      }

      const thumbnailUrl = await this.uploadThumbnail(
        videoId,
        inputPath,
        tmpDir,
        metadata.duration,
      );
      const publicUrl = this.storage.getPublicUrl(`${storagePrefix}/playlist.m3u8`);

      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          streamStatus: "ready",
          playbackUrl: publicUrl,
          videoExternalId: storagePrefix,
          durationSeconds: metadata.duration ? Math.round(metadata.duration) : null,
          thumbnailUrl,
        },
      });

      this.logger.log(`Video ${videoId} processed successfully`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Video ${videoId} processing failed: ${err?.message ?? String(error)}\n${err?.stack ?? ""}`,
      );
      await this.prisma.video.update({
        where: { id: videoId },
        data: { streamStatus: "error" },
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  private getVideoMetadata(inputPath: string): Promise<VideoMetadata> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(inputPath, (err: Error | null, metadata: FfprobeMetadata) => {
        if (err) {
          this.logger.warn("Could not get video metadata:", err.message);
          resolve({ duration: null, videoCodec: null, audioCodec: null });
          return;
        }
        const videoStream = metadata.streams.find((s) => s.codec_type === "video");
        const audioStream = metadata.streams.find((s) => s.codec_type === "audio");
        resolve({
          duration: metadata.format.duration ?? null,
          videoCodec: videoStream?.codec_name ?? null,
          audioCodec: audioStream?.codec_name ?? null,
        });
      });
    });
  }

  private async uploadThumbnail(
    videoId: string,
    inputPath: string,
    tmpDir: string,
    durationSeconds: number | null,
  ): Promise<string | null> {
    try {
      const seekSeconds = durationSeconds
        ? Math.max(0, Math.min(durationSeconds * 0.1, durationSeconds - 0.1))
        : 1;
      const thumbnailPath = path.join(tmpDir, "thumbnail.jpg");

      await this.extractThumbnail(inputPath, thumbnailPath, seekSeconds);

      const thumbnailKey = `videos/${videoId}/thumbnail.jpg`;
      const thumbnailBuffer = fs.readFileSync(thumbnailPath);
      const url = await this.storage.upload(thumbnailKey, thumbnailBuffer, "image/jpeg");

      this.logger.log(`Thumbnail generated for video ${videoId}`);
      return url;
    } catch (thumbErr) {
      this.logger.warn(
        `Thumbnail extraction failed for video ${videoId}:`,
        (thumbErr as Error).message,
      );
      return null;
    }
  }

  // TEMP: VIDEO_OUTPUT_FORMAT=mp4 (Cloudflare Stream 移行までの暫定)
  private convertToMp4(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setFfmpegPath(this.ffmpegPath)
        .outputOptions(["-c", "copy", "-movflags", "+faststart"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .run();
    });
  }

  private convertToHls(inputPath: string, outputDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setFfmpegPath(this.ffmpegPath)
        .outputOptions([
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-crf",
          "23",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-start_number",
          "0",
          "-hls_time",
          "10",
          "-hls_list_size",
          "0",
          "-f",
          "hls",
        ])
        .output(path.join(outputDir, "playlist.m3u8"))
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .run();
    });
  }

  private extractThumbnail(
    inputPath: string,
    outputPath: string,
    seekSeconds: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setFfmpegPath(this.ffmpegPath)
        .seekInput(seekSeconds)
        .frames(1)
        .outputOptions(["-q:v", "2"])
        .output(outputPath)
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
