"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCreateVenue } from "@/hooks/venues/use-venues";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ProductImageUpload, type ProductImage } from "@/components/product-image-upload";
import { SelectField } from "@/components/select-field";
import { PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";
import { VENUE_TYPE_OPTIONS } from "@/lib/constants/venue-types";

export default function VenueNewPage() {
  const router = useRouter();
  const t = useTranslations("venues");
  const { user, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace("/venues");
    }
  }, [authLoading, isAdmin, router]);

  if (authLoading || !isAdmin) {
    return <div className="py-12 text-center text-muted-foreground">{t("list.loading")}</div>;
  }

  return <VenueNewForm />;
}

function VenueNewForm() {
  const router = useRouter();
  const t = useTranslations("venues");
  const tType = useTranslations("venues.venueType");
  const createVenue = useCreateVenue();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [accessInfo, setAccessInfo] = useState("");
  const [venueTypes, setVenueTypes] = useState<string[]>([]);
  const [capacity, setCapacity] = useState("");
  const [publishStatus, setPublishStatus] = useState("draft");
  const [images, setImages] = useState<ProductImage[]>([]);

  const handleSubmit = () => {
    createVenue.mutate(
      {
        name,
        address: address || undefined,
        description: description || undefined,
        accessInfo: accessInfo || undefined,
        venueTypes,
        capacity: capacity ? Number(capacity) : undefined,
        publishStatus,
        imageFileIds: images.map((i) => i.fileId),
      },
      { onSuccess: () => router.push("/venues") },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/venues">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("heading.new")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("form.basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t("form.imagesLabel")}</Label>
            <ProductImageUpload value={images} onChange={setImages} />
          </div>
          <div>
            <Label>{t("form.nameLabel")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("form.namePlaceholder")}
              maxLength={200}
            />
          </div>
          <div>
            <Label>{t("form.addressLabel")}</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("form.addressPlaceholder")}
            />
          </div>
          <div>
            <Label>{t("form.descriptionLabel")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("form.descriptionPlaceholder")}
              rows={4}
            />
          </div>
          <div>
            <Label>{t("form.accessLabel")}</Label>
            <Textarea
              value={accessInfo}
              onChange={(e) => setAccessInfo(e.target.value)}
              placeholder={t("form.accessPlaceholder")}
              rows={3}
            />
          </div>
          <div>
            <Label>{t("form.venueTypesLabel")}</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {VENUE_TYPE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={venueTypes.includes(opt.value)}
                    onCheckedChange={(checked) => {
                      setVenueTypes((prev) =>
                        checked ? [...prev, opt.value] : prev.filter((v) => v !== opt.value),
                      );
                    }}
                  />
                  {tType(opt.value)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>{t("form.capacityLabel")}</Label>
            <Input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder={t("form.capacityPlaceholder")}
              min="1"
            />
          </div>
          <div>
            <Label>{t("form.publishStatusLabel")}</Label>
            <SelectField
              value={publishStatus}
              onChange={setPublishStatus}
              options={PUBLISH_STATUS_OPTIONS}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href="/venues">
              <Button variant="outline">{t("form.cancel")}</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!name || createVenue.isPending}>
              {createVenue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("form.submit")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
