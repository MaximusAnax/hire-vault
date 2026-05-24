"use client";

import { useTransition } from "react";
import { deleteJob } from "@/lib/applications/actions";
import { Button } from "@/components/ui/button";

export function DeleteJobButton({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={pending}
      onClick={() => startTransition(() => void deleteJob(jobId))}
    >
      Delete
    </Button>
  );
}
