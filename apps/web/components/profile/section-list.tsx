"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { DeleteAction } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Item {
  id: string;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
}

export function SectionList({
  title,
  description,
  items,
  onDelete,
  emptyMessage,
}: {
  title: string;
  description: string;
  items: Item[];
  onDelete: DeleteAction;
  emptyMessage: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-md border border-border p-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                  )}
                  {item.meta && (
                    <p className="text-xs text-muted-foreground mt-1">{item.meta}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    onClick={() =>
                      startTransition(() => void onDelete(item.id))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
