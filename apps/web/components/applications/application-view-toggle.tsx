"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ApplicationViewToggle() {
  const router = useRouter();
  const params = useSearchParams();
  const view = params.get("view") === "list" ? "list" : "board";

  function setView(next: "board" | "list") {
    const search = new URLSearchParams(params.toString());
    if (next === "board") search.delete("view");
    else search.set("view", next);
    const qs = search.toString();
    router.push(qs ? `/applications?${qs}` : "/applications");
  }

  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
      <Button
        type="button"
        size="sm"
        variant={view === "board" ? "default" : "ghost"}
        className="h-7 px-3 text-xs"
        onClick={() => setView("board")}
      >
        Board
      </Button>
      <Button
        type="button"
        size="sm"
        variant={view === "list" ? "default" : "ghost"}
        className="h-7 px-3 text-xs"
        onClick={() => setView("list")}
      >
        List
      </Button>
    </div>
  );
}
