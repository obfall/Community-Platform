"use client";

// import {
//   useOrientationPages,
//   useCompleteOrientation,
//   useMyCompletion,
// } from "@/hooks/orientation/use-orientation";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { GraduationCap, CheckCircle2 } from "lucide-react";

export default function OrientationPage() {
  // const { data, isLoading } = useOrientationPages();
  // const { data: completion } = useMyCompletion();
  // const complete = useCompleteOrientation();
  //
  // const pages = (data ?? []).filter((p) => p.isPublished);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">オリエンテーション</h1>
      </div>
      <div className="py-12 text-center text-muted-foreground">準備中</div>

      {/*
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">オリエンテーション</h1>
        {completion && (
          <Badge variant="default">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            完了済み
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : pages.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <GraduationCap className="mx-auto mb-4 h-12 w-12" />
          <p>公開されているページがありません</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {pages.map((p, i) => (
              <Card key={p.id}>
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">ステップ {i + 1}</Badge>
                  </div>
                  <h2 className="text-xl font-bold">{p.title}</h2>
                  <div className="prose max-w-none whitespace-pre-wrap text-sm">{p.body}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!completion && (
            <div className="flex justify-center pt-4">
              <Button size="lg" onClick={() => complete.mutate()} disabled={complete.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                オリエンテーションを完了
              </Button>
            </div>
          )}
        </>
      )}
      */}
    </div>
  );
}
