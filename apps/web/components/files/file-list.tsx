"use client";

import { Loader2 } from "lucide-react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileRow } from "./file-row";
import type { FileEntry } from "@/lib/api/types";

interface FileListProps {
  entries: FileEntry[];
  isLoading: boolean;
  onFolderClick: (id: string) => void;
  onRename: (entry: FileEntry) => void;
  onMove: (entry: FileEntry) => void;
}

export function FileList({ entries, isLoading, onFolderClick, onRename, onMove }: FileListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p>ファイルがありません</p>
        <p className="text-sm">フォルダを作成するか、ファイルをアップロードしてください</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40%]">名前</TableHead>
          <TableHead className="hidden sm:table-cell">更新者</TableHead>
          <TableHead className="hidden md:table-cell">更新日時</TableHead>
          <TableHead className="hidden md:table-cell">サイズ</TableHead>
          <TableHead className="w-[50px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <FileRow
            key={entry.id}
            entry={entry}
            onFolderClick={onFolderClick}
            onRename={onRename}
            onMove={onMove}
          />
        ))}
      </TableBody>
    </Table>
  );
}
