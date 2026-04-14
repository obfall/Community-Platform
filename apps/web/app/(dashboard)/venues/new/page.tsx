"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateVenue } from "@/hooks/venues/use-venues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";

const VENUE_TYPE_OPTIONS = [
  { value: "theater", label: "劇場" },
  { value: "concert_hall", label: "コンサート（音楽）ホール" },
  { value: "lecture_hall", label: "講演ホール" },
  { value: "plaza", label: "広場" },
  { value: "classroom_large", label: "教室(大)" },
  { value: "exhibition_hall", label: "展示ホール" },
  { value: "reception_hall", label: "レセプションホール" },
  { value: "dining_space", label: "飲食スペース" },
  { value: "conference_room_large", label: "会議室(大)" },
  { value: "live_house", label: "ライブハウス" },
  { value: "gymnasium", label: "体育館" },
  { value: "other", label: "その他" },
] as const;
import { ProductImageUpload, type ProductImage } from "@/components/product-image-upload";

export default function VenueNewPage() {
  const router = useRouter();
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
        <h1 className="text-2xl font-bold">施設登録</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>施設画像</Label>
            <ProductImageUpload value={images} onChange={setImages} />
          </div>
          <div>
            <Label>施設名</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="施設名を入力"
              maxLength={200}
            />
          </div>
          <div>
            <Label>住所</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="住所（任意）"
            />
          </div>
          <div>
            <Label>説明</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="施設の説明（任意）"
              rows={4}
            />
          </div>
          <div>
            <Label>アクセス</Label>
            <Textarea
              value={accessInfo}
              onChange={(e) => setAccessInfo(e.target.value)}
              placeholder="最寄駅・交通アクセス等（任意）"
              rows={3}
            />
          </div>
          <div>
            <Label>種別（複数選択可）</Label>
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
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>定員</Label>
            <Input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="定員（任意）"
              min="1"
            />
          </div>
          <div>
            <Label>公開ステータス</Label>
            <Select value={publishStatus} onValueChange={setPublishStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="published">公開</SelectItem>
                <SelectItem value="archived">アーカイブ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href="/venues">
              <Button variant="outline">キャンセル</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!name || createVenue.isPending}>
              {createVenue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              登録
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
