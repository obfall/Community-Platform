import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { contentsApi } from "@/lib/api/content";
import type { CreateContentInput, UpdateContentInput } from "@/lib/api/types";

export function useContents(query?: {
  page?: number;
  limit?: number;
  search?: string;
  contentType?: string;
  publishStatus?: string;
}) {
  return useQuery({
    queryKey: ["contents", query],
    queryFn: () => contentsApi.getAll(query),
  });
}

export function useContent(id: string | undefined) {
  return useQuery({
    queryKey: ["contents", id],
    queryFn: () => contentsApi.getOne(id!),
    enabled: !!id,
  });
}

export function useCreateContent() {
  const queryClient = useQueryClient();
  const t = useTranslations("contents.toast");
  return useMutation({
    mutationFn: (data: CreateContentInput) => contentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      toast.success(t("created"));
    },
  });
}

export function useUpdateContent() {
  const queryClient = useQueryClient();
  const t = useTranslations("contents.toast");
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContentInput }) =>
      contentsApi.update(id, data),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      queryClient.invalidateQueries({ queryKey: ["contents", vars.id] });
      toast.success(t("updated"));
    },
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();
  const t = useTranslations("contents.toast");
  return useMutation({
    mutationFn: (id: string) => contentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      toast.success(t("deleted"));
    },
  });
}
