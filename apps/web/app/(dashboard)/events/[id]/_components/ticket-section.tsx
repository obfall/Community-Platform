"use client";

import { useState } from "react";
import { useCreateTicket } from "@/hooks/events/use-events";
import { eventsApi } from "@/lib/api/events";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Ticket, Plus, Trash2 } from "lucide-react";
import type { EventTicket as EventTicketType } from "@/lib/api/types";

interface TicketSectionProps {
  eventId: string;
  tickets: EventTicketType[];
  isAdmin: boolean;
}

export function TicketSection({ eventId, tickets, isAdmin }: TicketSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ticketName, setTicketName] = useState("");
  const [price, setPrice] = useState("0");
  const [capacity, setCapacity] = useState("");
  const [purchaseLimit, setPurchaseLimit] = useState("1");
  const createTicket = useCreateTicket();
  const queryClient = useQueryClient();

  const handleCreate = () => {
    createTicket.mutate(
      {
        eventId,
        data: {
          ticketName,
          price: parseInt(price, 10) || 0,
          capacity: capacity ? parseInt(capacity, 10) : undefined,
          purchaseLimit: parseInt(purchaseLimit, 10) || 1,
        },
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setTicketName("");
          setPrice("0");
          setCapacity("");
          setPurchaseLimit("1");
        },
      },
    );
  };

  const handleDelete = async (ticketId: string) => {
    try {
      await eventsApi.deleteTicket(ticketId);
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      toast.success("チケットを削除しました");
    } catch {
      toast.error("チケットの削除に失敗しました");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            チケット
          </CardTitle>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="mr-1 h-3 w-3" />
                  追加
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>チケット追加</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>チケット名</Label>
                    <Input
                      value={ticketName}
                      onChange={(e) => setTicketName(e.target.value)}
                      placeholder="例: 一般チケット"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>価格（円）</Label>
                      <Input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label>定員（空欄=無制限）</Label>
                      <Input
                        type="number"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        min="1"
                        placeholder="無制限"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>1人あたり購入上限</Label>
                    <Input
                      type="number"
                      value={purchaseLimit}
                      onChange={(e) => setPurchaseLimit(e.target.value)}
                      min="1"
                    />
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={!ticketName || createTicket.isPending}
                    className="w-full"
                  >
                    追加
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tickets.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">チケットがありません</p>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="text-sm font-medium">{ticket.ticketName}</p>
                {ticket.capacity != null && (
                  <p className="text-xs text-muted-foreground">
                    残り {ticket.capacity - ticket.soldCount} / {ticket.capacity}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold">
                  {ticket.price === 0 ? "無料" : `¥${ticket.price.toLocaleString()}`}
                </p>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(ticket.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
