"use client";

import { Switch } from "@/components/ui/switch";
import { useToggleFeature } from "@/hooks/use-feature-settings";
import type { FeatureSetting } from "@/lib/api/types";

interface FeatureToggleItemProps {
  feature: FeatureSetting;
  disabled?: boolean;
}

export function FeatureToggleItem({ feature, disabled }: FeatureToggleItemProps) {
  const toggleMutation = useToggleFeature();

  const handleToggle = (checked: boolean) => {
    toggleMutation.mutate({
      featureKey: feature.featureKey,
      data: { isEnabled: checked },
    });
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{feature.featureName}</p>
        {feature.description && (
          <p className="text-xs text-muted-foreground">{feature.description}</p>
        )}
      </div>
      <Switch
        checked={feature.isEnabled}
        onCheckedChange={handleToggle}
        disabled={disabled || toggleMutation.isPending}
      />
    </div>
  );
}
