"use client";

import { useRouter } from "next/navigation";
import { ImportPreview } from "@/components/ingestion/import-preview";
import type { PreviewSummary, ProfileSource } from "@hirevault/types";

type Props = {
  runId: string;
  preview: PreviewSummary;
  source: ProfileSource;
};

export function ImportPreviewPanel({ runId, preview, source }: Props) {
  const router = useRouter();

  return (
    <ImportPreview
      runId={runId}
      preview={preview}
      source={source}
      onComplete={() => router.refresh()}
      onCancel={() => router.refresh()}
    />
  );
}
