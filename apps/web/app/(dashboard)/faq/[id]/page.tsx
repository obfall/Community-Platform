"use client";

// import { use } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useFaqArticle, useDeleteFaq } from "@/hooks/faq/use-faq";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

export default function FaqDetailPage() {
  // const { id } = use(params);
  // const router = useRouter();
  // const { data, isLoading } = useFaqArticle(id);
  // const deleteFaq = useDeleteFaq();
  //
  // const handleDelete = () => {
  //   if (confirm("本当に削除しますか?")) {
  //     deleteFaq.mutate(id, { onSuccess: () => router.push("/faq") });
  //   }
  // };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">FAQ</h1>
      </div>
      <div className="py-12 text-center text-muted-foreground">準備中</div>

      {/*
      if (isLoading) {
        return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
      }
      if (!data) {
        return <div className="py-12 text-center text-muted-foreground">FAQが見つかりません</div>;
      }

      return (
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/faq">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex gap-2">
              <Link href={`/faq/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-2 h-4 w-4" />
                  編集
                </Button>
              </Link>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{data.category}</Badge>
                {!data.isPublished && <Badge variant="secondary">下書き</Badge>}
              </div>
              <h1 className="text-2xl font-bold">{data.title}</h1>
              <div className="prose max-w-none whitespace-pre-wrap text-sm">{data.body}</div>
            </CardContent>
          </Card>
        </div>
      );
      */}
    </div>
  );
}
