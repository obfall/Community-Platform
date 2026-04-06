"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useGrantPoints,
  usePointRules,
  useCreatePointRule,
  useDeletePointRule,
} from "@/hooks/use-points";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

const TRIGGER_LABELS: Record<string, string> = {
  event_attendance: "イベント参加",
  product_purchase: "商品購入",
  daily_login: "デイリーログイン",
  board_post: "掲示板投稿",
  survey_complete: "アンケート回答",
  video_complete: "動画視聴完了",
  orientation_complete: "オリエンテーション完了",
};

export default function PointGrantPage() {
  const grantPoints = useGrantPoints();
  const { data: rules } = usePointRules();
  const createRule = useCreatePointRule();
  const deleteRule = useDeletePointRule();

  const [userId, setUserId] = useState("");
  const [points, setPoints] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDays, setExpiryDays] = useState("");

  const [ruleName, setRuleName] = useState("");
  const [ruleTrigger, setRuleTrigger] = useState("");
  const [rulePoints, setRulePoints] = useState("");
  const [ruleExpiry, setRuleExpiry] = useState("");

  const handleGrant = () => {
    grantPoints.mutate(
      {
        userId,
        points: Number(points),
        description: description || undefined,
        expiryDays: expiryDays ? Number(expiryDays) : undefined,
      },
      {
        onSuccess: () => {
          setUserId("");
          setPoints("");
          setDescription("");
          setExpiryDays("");
        },
      },
    );
  };

  const handleCreateRule = () => {
    createRule.mutate(
      {
        name: ruleName,
        triggerEvent: ruleTrigger,
        pointAmount: Number(rulePoints),
        expiryDays: Number(ruleExpiry),
      },
      {
        onSuccess: () => {
          setRuleName("");
          setRuleTrigger("");
          setRulePoints("");
          setRuleExpiry("");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/points">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">ポイント発行</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>手動付与</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>ユーザーID</Label>
              <Input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="UUID"
              />
            </div>
            <div>
              <Label>ポイント数</Label>
              <Input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="100"
                min="1"
              />
            </div>
            <div>
              <Label>説明</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="付与理由（任意）"
              />
            </div>
            <div>
              <Label>有効期限（日数）</Label>
              <Input
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                placeholder="90"
                min="1"
              />
            </div>
          </div>
          <Button onClick={handleGrant} disabled={!userId || !points || grantPoints.isPending}>
            {grantPoints.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            付与
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>自動付与ルール</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label>ルール名</Label>
              <Input
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="ルール名"
              />
            </div>
            <div>
              <Label>トリガー</Label>
              <Select value={ruleTrigger} onValueChange={setRuleTrigger}>
                <SelectTrigger>
                  <SelectValue placeholder="選択" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ポイント数</Label>
              <Input
                type="number"
                value={rulePoints}
                onChange={(e) => setRulePoints(e.target.value)}
                min="1"
              />
            </div>
            <div>
              <Label>有効期限（日数）</Label>
              <Input
                type="number"
                value={ruleExpiry}
                onChange={(e) => setRuleExpiry(e.target.value)}
                min="1"
              />
            </div>
          </div>
          <Button
            onClick={handleCreateRule}
            disabled={
              !ruleName || !ruleTrigger || !rulePoints || !ruleExpiry || createRule.isPending
            }
          >
            ルール作成
          </Button>

          {rules && rules.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ルール名</TableHead>
                  <TableHead>トリガー</TableHead>
                  <TableHead>ポイント</TableHead>
                  <TableHead>有効期限</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{TRIGGER_LABELS[r.triggerEvent] ?? r.triggerEvent}</TableCell>
                    <TableCell>{r.pointAmount}</TableCell>
                    <TableCell>{r.expiryDays}日</TableCell>
                    <TableCell>
                      <Badge variant={r.isActive ? "default" : "secondary"}>
                        {r.isActive ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteRule.mutate(r.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
