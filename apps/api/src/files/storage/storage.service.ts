import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import type { Readable } from "stream";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null = null;
  private readonly bucket: string;
  private readonly publicUrl: string | null;

  constructor(private readonly config: ConfigService) {
    const accountId = config.get<string>("CLOUDFLARE_ACCOUNT_ID");
    const accessKeyId = config.get<string>("R2_ACCESS_KEY_ID");
    const secretAccessKey = config.get<string>("R2_SECRET_ACCESS_KEY");
    const s3Endpoint = config.get<string>("S3_ENDPOINT");

    if (s3Endpoint && accessKeyId && secretAccessKey) {
      // MinIO またはカスタム S3 互換ストレージ
      this.client = new S3Client({
        region: "auto",
        endpoint: s3Endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
      });
      this.logger.log(`S3-compatible storage initialized (${s3Endpoint})`);
    } else if (accountId && accessKeyId && secretAccessKey) {
      // Cloudflare R2
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log("R2 storage client initialized");
    } else {
      this.logger.warn("Storage credentials not configured — file upload will be unavailable");
    }

    this.bucket = config.get<string>("R2_BUCKET_NAME") ?? "community-files";
    this.publicUrl = config.get<string>("R2_PUBLIC_URL") ?? null;
  }

  /**
   * S3 互換ストレージにファイルをアップロード。
   *
   * @param originalName 指定するとオブジェクトに Content-Disposition: attachment; filename=... を
   *   メタデータとして保存し、ブラウザがダウンロード時に元のファイル名で保存するようになる。
   *   日本語ファイル名は RFC 5987 (filename*=UTF-8''...) に対応した形式で書き込む。
   *   HLS chunks やサムネイル等、ブラウザ表示が目的のオブジェクトでは省略してよい。
   */
  async upload(
    key: string,
    body: Buffer,
    contentType: string,
    originalName?: string,
  ): Promise<string | null> {
    this.ensureClient();

    try {
      await this.client!.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          ...(originalName && {
            ContentDisposition: buildContentDisposition(originalName),
          }),
        }),
      );
    } catch (error) {
      this.logger.error(
        `Storage upload failed: key=${key}, bucket=${this.bucket}, size=${body.length}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }

    return this.getPublicUrl(key);
  }

  async delete(key: string): Promise<void> {
    this.ensureClient();

    await this.client!.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getObject(key: string): Promise<{ stream: Readable; contentType: string }> {
    this.ensureClient();

    const res = await this.client!.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));

    return {
      stream: res.Body as Readable,
      contentType: res.ContentType ?? "application/octet-stream",
    };
  }

  getPublicUrl(key: string): string | null {
    if (!this.publicUrl) return null;
    return `${this.publicUrl}/${key}`;
  }

  private ensureClient(): void {
    if (!this.client) {
      throw new ServiceUnavailableException("ファイルストレージが設定されていません");
    }
  }
}

/**
 * Content-Disposition ヘッダーを RFC 5987 / RFC 6266 に従って組み立てる。
 * ASCII セーフな filename と、UTF-8 percent-encoded な filename* の両方を入れることで
 * 古いブラウザでも妥当な代替名にフォールバックしつつ、モダンブラウザは日本語ファイル名を正しく扱う。
 */
function buildContentDisposition(originalName: string): string {
  // ファイル名内のダブルクォートとバックスラッシュをエスケープ + 非 ASCII を _ に置換
  const asciiSafe = originalName.replace(/[\\"]/g, "_").replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(originalName);
  return `attachment; filename="${asciiSafe}"; filename*=UTF-8''${encoded}`;
}
