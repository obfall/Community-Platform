import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { faqApi, type FaqInput } from "@/lib/api/faq";

export function useFaqArticles(category?: string) {
  return useQuery({
    queryKey: ["faq", { category }],
    queryFn: () => faqApi.getAll(category),
  });
}

export function useFaqCategories() {
  return useQuery({
    queryKey: ["faq", "categories"],
    queryFn: () => faqApi.getCategories(),
  });
}

export function useFaqArticle(id: string | undefined) {
  return useQuery({
    queryKey: ["faq", id],
    queryFn: () => faqApi.getOne(id!),
    enabled: !!id,
  });
}

export function useCreateFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FaqInput) => faqApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faq"] });
      toast.success("FAQを作成しました");
    },
    onError: () => toast.error("FAQの作成に失敗しました"),
  });
}

export function useUpdateFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FaqInput> }) => faqApi.update(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["faq"] });
      qc.invalidateQueries({ queryKey: ["faq", vars.id] });
      toast.success("FAQを更新しました");
    },
    onError: () => toast.error("FAQの更新に失敗しました"),
  });
}

export function useDeleteFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => faqApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faq"] });
      toast.success("FAQを削除しました");
    },
    onError: () => toast.error("FAQの削除に失敗しました"),
  });
}
