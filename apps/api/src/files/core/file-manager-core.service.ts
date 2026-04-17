import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@/prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import type { FileManagerScopeConfig, ListOpts, FileRow, FolderDetail } from "./file-manager.types";

const UPLOADER_SELECT = {
  id: true,
  name: true,
  profile: { select: { avatarUrl: true } },
} as const;

type UploaderLike = {
  id: string;
  name: string;
  profile?: { avatarUrl: string | null } | null;
};

function mapUploader(u: UploaderLike) {
  return { id: u.id, name: u.name, avatarUrl: u.profile?.avatarUrl ?? null };
}

@Injectable()
export class FileManagerCoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // biome-ignore lint/suspicious/noExplicitAny: Prisma delegate は動的にアクセス
  private delegate(cfg: FileManagerScopeConfig): any {
    // biome-ignore lint/suspicious/noExplicitAny: 動的アクセス
    return (this.prisma as any)[cfg.delegate];
  }

  private scopeWhere(
    cfg: FileManagerScopeConfig,
    scopeId: string,
    base: Record<string, unknown> = {},
  ): Record<string, unknown> {
    if (!cfg.scopeField) return base;
    return { ...base, [cfg.scopeField]: scopeId };
  }

  // ========================================================================
  // List
  // ========================================================================

  async list(cfg: FileManagerScopeConfig, scopeId: string, opts: ListOpts): Promise<FileRow[]> {
    const where = this.scopeWhere(cfg, scopeId, {
      parentFolderId: opts.folderId ?? null,
    });

    // 検索時は name / file.originalName の部分一致
    if (opts.search) {
      Object.assign(where, {
        OR: [
          { name: { contains: opts.search, mode: "insensitive" } },
          { file: { originalName: { contains: opts.search, mode: "insensitive" } } },
        ],
      });
      // 検索時は parentFolderId フィルタを外す（現在フォルダ横断はスコープ外だが名前検索は現在フォルダ内）
      // 計画書に「現在フォルダ内のみ検索」と明記のため parentFolderId はそのまま保持
    }

    // ソート: 常にフォルダ → ファイルの順
    // Prisma ではCASE文をorderByに使えないのでraw queryは使わず、
    // type asc (file > folder ではなく folder < file) → sortField で並べる
    // type: "file" | "folder" → alphabetically "file" < "folder" なので asc で folder が後ろに来る
    // → 逆にする必要がある: type desc で folder が先、file が後
    // ※ "file" < "folder" (f-i-l < f-o-l) → asc で file が先。desc で folder が先。
    // 正しくは: "file" (ASCII) < "folder" → asc = file first, desc = folder first
    // つまり type: "desc" で folder が先になる ✓

    const orderBy: Record<string, string>[] = [{ type: "desc" }]; // folder first

    switch (opts.sort) {
      case "name":
        orderBy.push({ name: opts.order });
        break;
      case "updatedAt":
        orderBy.push({ updatedAt: opts.order });
        break;
      case "size":
        // サイズソートは file.fileSizeBytes に依存するが Prisma の relation sort が制限的
        // → updatedAt でフォールバック、アプリ側で再ソート
        orderBy.push({ updatedAt: opts.order });
        break;
    }

    const rows = await this.delegate(cfg).findMany({
      where,
      orderBy,
      include: {
        uploadedBy: { select: UPLOADER_SELECT },
        file: true,
      },
    });

    let mapped = (rows as RawRow[]).map((r) => this.mapRow(r));

    // サイズソート: file.fileSizeBytes で再ソート（フォルダ → ファイルの順は維持）
    if (opts.sort === "size") {
      const folders = mapped.filter((r) => r.type === "folder");
      const files = mapped.filter((r) => r.type === "file");
      files.sort((a, b) => {
        const sizeA = a.file?.fileSizeBytes ?? 0;
        const sizeB = b.file?.fileSizeBytes ?? 0;
        return opts.order === "asc" ? sizeA - sizeB : sizeB - sizeA;
      });
      mapped = [...folders, ...files];
    }

    return mapped;
  }

  // ========================================================================
  // Folder Detail + Breadcrumb
  // ========================================================================

  async getFolder(
    cfg: FileManagerScopeConfig,
    scopeId: string,
    folderId: string,
  ): Promise<FolderDetail> {
    const folder = await this.delegate(cfg).findUnique({
      where: { id: folderId },
    });
    if (!folder || folder.type !== "folder") {
      throw new NotFoundException("フォルダが見つかりません");
    }
    // スコープ検証
    const scopeValue = cfg.scopeField ? (folder as Record<string, unknown>)[cfg.scopeField] : null;
    if (cfg.scopeField && scopeValue !== scopeId) {
      throw new NotFoundException("フォルダが見つかりません");
    }

    // 祖先チェーンを辿ってパンくずを構築
    const breadcrumb: Array<{ id: string; name: string }> = [];
    let current = folder;
    while (current.parentFolderId) {
      const parent = await this.delegate(cfg).findUnique({
        where: { id: current.parentFolderId },
      });
      if (!parent) break;
      breadcrumb.unshift({ id: parent.id, name: parent.name ?? "" });
      current = parent;
    }
    breadcrumb.push({ id: folder.id, name: folder.name ?? "" });

    return {
      id: folder.id,
      name: folder.name ?? "",
      parentFolderId: folder.parentFolderId,
      breadcrumb,
    };
  }

  // ========================================================================
  // Create Folder
  // ========================================================================

  async createFolder(
    cfg: FileManagerScopeConfig,
    scopeId: string,
    userId: string,
    data: { parentFolderId?: string; name: string },
  ): Promise<FileRow> {
    // 親フォルダの存在確認
    if (data.parentFolderId) {
      await this.ensureFolderExists(cfg, scopeId, data.parentFolderId);
    }

    const createData: Record<string, unknown> = {
      type: "folder",
      name: data.name,
      parentFolderId: data.parentFolderId ?? null,
      uploadedByUserId: userId,
    };
    if (cfg.scopeField) {
      createData[cfg.scopeField] = scopeId;
    }

    const row = await this.delegate(cfg).create({
      data: createData,
      include: {
        uploadedBy: { select: UPLOADER_SELECT },
        file: true,
      },
    });

    return this.mapRow(row as RawRow);
  }

  // ========================================================================
  // Register File (associate uploaded File with scope)
  // ========================================================================

  async registerFile(
    cfg: FileManagerScopeConfig,
    scopeId: string,
    userId: string,
    data: { fileId: string; parentFolderId?: string; name?: string },
  ): Promise<FileRow> {
    // File エンティティの存在確認
    const file = await this.prisma.file.findUnique({
      where: { id: data.fileId, deletedAt: null },
    });
    if (!file) {
      throw new NotFoundException("ファイルが見つかりません");
    }

    // 親フォルダの存在確認
    if (data.parentFolderId) {
      await this.ensureFolderExists(cfg, scopeId, data.parentFolderId);
    }

    const createData: Record<string, unknown> = {
      type: "file",
      name: data.name ?? null,
      fileId: data.fileId,
      parentFolderId: data.parentFolderId ?? null,
      uploadedByUserId: userId,
    };
    if (cfg.scopeField) {
      createData[cfg.scopeField] = scopeId;
    }

    const row = await this.delegate(cfg).create({
      data: createData,
      include: {
        uploadedBy: { select: UPLOADER_SELECT },
        file: true,
      },
    });

    return this.mapRow(row as RawRow);
  }

  // ========================================================================
  // Rename
  // ========================================================================

  async rename(
    cfg: FileManagerScopeConfig,
    scopeId: string,
    rowId: string,
    name: string,
  ): Promise<FileRow> {
    await this.ensureEntryInScope(cfg, scopeId, rowId);

    const row = await this.delegate(cfg).update({
      where: { id: rowId },
      data: { name },
      include: {
        uploadedBy: { select: UPLOADER_SELECT },
        file: true,
      },
    });

    return this.mapRow(row as RawRow);
  }

  // ========================================================================
  // Move
  // ========================================================================

  async move(
    cfg: FileManagerScopeConfig,
    scopeId: string,
    rowId: string,
    parentFolderId: string | null,
  ): Promise<FileRow> {
    const entry = await this.ensureEntryInScope(cfg, scopeId, rowId);

    // 自分自身に移動しようとしていないか
    if (parentFolderId === rowId) {
      throw new BadRequestException("自分自身を親フォルダに設定することはできません");
    }

    // 移動先フォルダの存在確認
    if (parentFolderId) {
      await this.ensureFolderExists(cfg, scopeId, parentFolderId);

      // フォルダを子孫に移動しようとしていないか（循環参照防止）
      if (entry.type === "folder") {
        const descendants = await this.collectDescendantIds(cfg, rowId);
        if (descendants.has(parentFolderId)) {
          throw new BadRequestException("子孫フォルダへの移動はできません");
        }
      }
    }

    const row = await this.delegate(cfg).update({
      where: { id: rowId },
      data: { parentFolderId },
      include: {
        uploadedBy: { select: UPLOADER_SELECT },
        file: true,
      },
    });

    return this.mapRow(row as RawRow);
  }

  // ========================================================================
  // Remove (recursive for folders)
  // ========================================================================

  async remove(
    cfg: FileManagerScopeConfig,
    scopeId: string,
    rowId: string,
  ): Promise<{ deletedCount: number }> {
    const entry = await this.ensureEntryInScope(cfg, scopeId, rowId);

    if (entry.type === "folder") {
      // 子孫を再帰的に収集して一括削除
      const descendantIds = await this.collectDescendantIds(cfg, rowId);
      const allIds = [rowId, ...descendantIds];

      // 子から親の順で削除（外部キー制約のため）
      // deleteMany は自己参照制約でエラーになる可能性があるため、深さ順に削除
      await this.deleteInOrder(cfg, allIds);

      return { deletedCount: allIds.length };
    }

    await this.delegate(cfg).delete({ where: { id: rowId } });
    return { deletedCount: 1 };
  }

  // ========================================================================
  // Reorder
  // ========================================================================

  async reorder(
    cfg: FileManagerScopeConfig,
    scopeId: string,
    items: Array<{ id: string; sortOrder: number }>,
  ): Promise<void> {
    await this.prisma.$transaction(
      items.map(
        (item) =>
          this.delegate(cfg).update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          }) as Prisma.PrismaPromise<unknown>,
      ),
    );
  }

  // ========================================================================
  // Download
  // ========================================================================

  async getDownloadInfo(
    cfg: FileManagerScopeConfig,
    scopeId: string,
    rowId: string,
  ): Promise<{ storageKey: string; fileName: string; contentType: string }> {
    const entry = await this.delegate(cfg).findUnique({
      where: { id: rowId },
      include: { file: true },
    });
    if (!entry) throw new NotFoundException("エントリが見つかりません");
    if (cfg.scopeField) {
      const scopeValue = (entry as Record<string, unknown>)[cfg.scopeField];
      if (scopeValue !== scopeId) throw new NotFoundException("エントリが見つかりません");
    }
    if (entry.type !== "file" || !entry.file) {
      throw new BadRequestException("フォルダはダウンロードできません");
    }

    return {
      storageKey: entry.file.storageKey,
      fileName: entry.name ?? entry.file.originalName,
      contentType: entry.file.contentType,
    };
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private async ensureEntryInScope(cfg: FileManagerScopeConfig, scopeId: string, entryId: string) {
    const entry = await this.delegate(cfg).findUnique({
      where: { id: entryId },
    });
    if (!entry) {
      throw new NotFoundException("エントリが見つかりません");
    }
    if (cfg.scopeField) {
      const scopeValue = (entry as Record<string, unknown>)[cfg.scopeField];
      if (scopeValue !== scopeId) {
        throw new NotFoundException("エントリが見つかりません");
      }
    }
    return entry as { id: string; type: string; parentFolderId: string | null };
  }

  private async ensureFolderExists(cfg: FileManagerScopeConfig, scopeId: string, folderId: string) {
    const folder = await this.delegate(cfg).findUnique({
      where: { id: folderId },
    });
    if (!folder || folder.type !== "folder") {
      throw new NotFoundException("指定された親フォルダが見つかりません");
    }
    if (cfg.scopeField) {
      const scopeValue = (folder as Record<string, unknown>)[cfg.scopeField];
      if (scopeValue !== scopeId) {
        throw new NotFoundException("指定された親フォルダが見つかりません");
      }
    }
  }

  private async collectDescendantIds(
    cfg: FileManagerScopeConfig,
    folderId: string,
  ): Promise<Set<string>> {
    const ids = new Set<string>();
    const queue = [folderId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await this.delegate(cfg).findMany({
        where: { parentFolderId: currentId },
        select: { id: true, type: true },
      });
      for (const child of children as Array<{ id: string; type: string }>) {
        ids.add(child.id);
        if (child.type === "folder") {
          queue.push(child.id);
        }
      }
    }

    return ids;
  }

  private async deleteInOrder(cfg: FileManagerScopeConfig, ids: string[]): Promise<void> {
    // 葉から削除するため、各 ID の深さを計算して深い順に削除
    const depthMap = new Map<string, number>();

    for (const id of ids) {
      const entry = await this.delegate(cfg).findUnique({
        where: { id },
        select: { id: true, parentFolderId: true },
      });
      if (!entry) continue;

      let depth = 0;
      let parentId = entry.parentFolderId;
      while (parentId && ids.includes(parentId)) {
        depth++;
        const parent = await this.delegate(cfg).findUnique({
          where: { id: parentId },
          select: { parentFolderId: true },
        });
        if (!parent) break;
        parentId = parent.parentFolderId;
      }
      depthMap.set(id, depth);
    }

    // 深い順にソート
    const sorted = [...ids].sort((a, b) => (depthMap.get(b) ?? 0) - (depthMap.get(a) ?? 0));

    for (const id of sorted) {
      await this.delegate(cfg)
        .delete({ where: { id } })
        .catch(() => {
          // 既に削除済みの場合はスキップ
        });
    }
  }

  private mapRow(row: RawRow): FileRow {
    const file = row.file;
    return {
      id: row.id,
      type: row.type as "file" | "folder",
      name: row.name ?? file?.originalName ?? "",
      parentFolderId: row.parentFolderId,
      sortOrder: row.sortOrder,
      uploadedBy: mapUploader(row.uploadedBy),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      file: file
        ? {
            id: file.id,
            originalName: file.originalName,
            contentType: file.contentType,
            fileSizeBytes: Number(file.fileSizeBytes),
            publicUrl: file.publicUrl,
            thumbnailUrl: file.thumbnailStorageKey
              ? this.storage.getPublicUrl(file.thumbnailStorageKey)
              : null,
          }
        : null,
    };
  }
}

// 内部型: Prisma から返ってくる生のレコード
interface RawRow {
  id: string;
  type: string;
  name: string | null;
  parentFolderId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  uploadedBy: UploaderLike;
  file: {
    id: string;
    originalName: string;
    contentType: string;
    fileSizeBytes: bigint;
    publicUrl: string | null;
    thumbnailStorageKey: string | null;
  } | null;
}
