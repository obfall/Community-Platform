"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderPlus, Upload, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FileSortField } from "@/lib/api/types";

interface FileToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: FileSortField;
  onSortChange: (value: FileSortField) => void;
  order: "asc" | "desc";
  onOrderChange: (value: "asc" | "desc") => void;
  onCreateFolder: () => void;
  folderId?: string;
}

export function FileToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  order,
  onOrderChange,
  onCreateFolder,
}: FileToolbarProps) {
  // デバウンス検索
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(localSearch), 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const toggleOrder = useCallback(() => {
    onOrderChange(order === "asc" ? "desc" : "asc");
  }, [order, onOrderChange]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="ファイル名で検索..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="flex items-center gap-2">
        <Select value={sort} onValueChange={(v) => onSortChange(v as FileSortField)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">名前</SelectItem>
            <SelectItem value="updatedAt">更新日時</SelectItem>
            <SelectItem value="size">サイズ</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={toggleOrder}
          title={order === "asc" ? "昇順" : "降順"}
        >
          <ArrowUpDown className={`h-4 w-4 ${order === "desc" ? "rotate-180" : ""}`} />
        </Button>

        <Button variant="outline" size="sm" onClick={onCreateFolder}>
          <FolderPlus className="mr-1 h-4 w-4" />
          新規フォルダ
        </Button>

        {/* アップロードボタンは UploadDropzone 側の hidden input トリガーとして配置 */}
        <Button
          variant="default"
          size="sm"
          onClick={() => document.getElementById("file-upload-input")?.click()}
        >
          <Upload className="mr-1 h-4 w-4" />
          アップロード
        </Button>
      </div>
    </div>
  );
}
