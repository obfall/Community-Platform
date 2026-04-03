import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

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

    if (accountId && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log("R2 storage client initialized");
    } else {
      this.logger.warn("R2 credentials not configured — file upload will be unavailable");
    }

    this.bucket = config.get<string>("R2_BUCKET_NAME") ?? "community-files";
    this.publicUrl = config.get<string>("R2_PUBLIC_URL") ?? null;
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string | null> {
    this.ensureClient();

    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

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
