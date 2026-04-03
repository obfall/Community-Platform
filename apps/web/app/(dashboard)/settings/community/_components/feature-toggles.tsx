"use client";

import { useFeatures } from "@/hooks/use-features";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FeatureToggleItem } from "./feature-toggle-item";

export function FeatureToggles() {
  const { data: features, isLoading } = useFeatures();

  const commonFeatures = features?.filter((f) => f.category === "common") ?? [];
  const optionalFeatures = features?.filter((f) => f.category === "optional") ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">読み込み中...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            必須機能
            <Badge variant="secondary">常時有効</Badge>
          </CardTitle>
          <CardDescription>
            コミュニティの基本機能です。無効にすることはできません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {commonFeatures.map((feature) => (
              <FeatureToggleItem key={feature.featureKey} feature={feature} disabled />
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>オプション機能</CardTitle>
          <CardDescription>必要に応じて有効/無効を切り替えられます。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {optionalFeatures.map((feature) => (
              <FeatureToggleItem key={feature.featureKey} feature={feature} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
