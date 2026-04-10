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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ProductImageUpload, type ProductImage } from "@/components/product-image-upload";

export default function VenueNewPage() {
  const router = useRouter();
  const createVenue = useCreateVenue();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [accessInfo, setAccessInfo] = useState("");
  const [venueType, setVenueType] = useState("conference_room");
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
        venueType,
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>種別</Label>
              <Select value={venueType} onValueChange={setVenueType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="theater">劇場</SelectItem>
                  <SelectItem value="concert_hall">コンサートホール</SelectItem>
                  <SelectItem value="conference_room">会議室</SelectItem>
                  <SelectItem value="stadium">スタジアム</SelectItem>
                  <SelectItem value="outdoor">屋外</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
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
