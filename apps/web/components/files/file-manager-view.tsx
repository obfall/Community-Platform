"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileScopeProvider, type FileScope } from "./file-scope";
import { FileToolbar } from "./file-toolbar";
import { FileList } from "./file-list";
import { FileBreadcrumb } from "./file-breadcrumb";
import { CreateFolderDialog } from "./create-folder-dialog";
import { RenameDialog } from "./rename-dialog";
import { MoveDialog } from "./move-dialog";
import { UploadDropzone } from "./upload-dropzone";
import { useFileList, useFolder } from "@/hooks/files/use-files-manager";
import type { FileEntry, FileSortField } from "@/lib/api/types";

interface FileManagerViewProps {
  scope: FileScope;
}

export function FileManagerView({ scope }: FileManagerViewProps) {
  return (
    <FileScopeProvider scope={scope}>
      <FileManagerViewInner />
    </FileScopeProvider>
  );
}

function FileManagerViewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const folderId = searchParams.get("folderId") ?? undefined;
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<FileSortField>("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const { data: entries = [], isLoading } = useFileList({
    folderId,
    q: search || undefined,
    sort,
    order,
  });
  const { data: folderDetail } = useFolder(folderId);

  // ダイアログ state
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null);
  const [moveTarget, setMoveTarget] = useState<FileEntry | null>(null);

  const navigateToFolder = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("folderId", id);
      } else {
        params.delete("folderId");
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="space-y-4">
      <FileBreadcrumb breadcrumb={folderDetail?.breadcrumb ?? []} onNavigate={navigateToFolder} />

      <FileToolbar
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        order={order}
        onOrderChange={setOrder}
        onCreateFolder={() => setCreateFolderOpen(true)}
        folderId={folderId}
      />

      <UploadDropzone folderId={folderId}>
        <FileList
          entries={entries}
          isLoading={isLoading}
          onFolderClick={(id) => navigateToFolder(id)}
          onRename={setRenameTarget}
          onMove={setMoveTarget}
        />
      </UploadDropzone>

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        parentFolderId={folderId}
      />

      {renameTarget && (
        <RenameDialog
          open={!!renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          entry={renameTarget}
        />
      )}

      {moveTarget && (
        <MoveDialog
          open={!!moveTarget}
          onOpenChange={(open) => !open && setMoveTarget(null)}
          entry={moveTarget}
          currentFolderId={folderId}
        />
      )}
    </div>
  );
}
