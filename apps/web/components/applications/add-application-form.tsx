"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  createApplication,
  parseAndPreviewJob,
  type ParseAndPreviewJobResult,
} from "@/lib/applications/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StarRating } from "@/components/ui/star-rating";
import { JobPreviewCard } from "./job-preview-card";

type Banner =
  | { kind: "blocked"; message: string; url: string }
  | { kind: "error"; message: string }
  | null;

export function AddApplicationForm({ initialAddUrl }: { initialAddUrl?: string }) {
  const [pending, startTransition] = useTransition();
  const [smartInput, setSmartInput] = useState("");
  const [preview, setPreview] = useState<ParseAndPreviewJobResult | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [fromExtension, setFromExtension] = useState(false);
  const addUrlHandled = useRef(false);

  // Manual form priority is uncontrolled-ish but we mirror into hidden input via StarRating's `name`.
  const [manualPriority, setManualPriority] = useState<number | null>(null);

  const handleSmartSubmit = (input?: string) => {
    const value = (input ?? smartInput).trim();
    if (!value) return;
    setBanner(null);
    setPreview(null);
    startTransition(async () => {
      const result = await parseAndPreviewJob(value);
      if ("error" in result) {
        setBanner({ kind: "error", message: result.error });
        return;
      }
      if ("blocked" in result && result.blocked) {
        setBanner({ kind: "blocked", message: result.fallbackHint, url: result.url });
        return;
      }
      setPreview(result as ParseAndPreviewJobResult);
    });
  };

  useEffect(() => {
    const url = initialAddUrl?.trim();
    if (!url || addUrlHandled.current) return;
    addUrlHandled.current = true;
    setFromExtension(true);
    setSmartInput(url);
    document.getElementById("add")?.scrollIntoView({ behavior: "smooth", block: "start" });
    const t = window.setTimeout(() => handleSmartSubmit(url), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for extension deep link
  }, [initialAddUrl]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add a job</CardTitle>
      </CardHeader>
      <CardContent>
        {preview ? (
          <JobPreviewCard
            preview={preview}
            onCancel={() => {
              setPreview(null);
              setSmartInput("");
            }}
            onSaved={() => {
              setPreview(null);
              setSmartInput("");
            }}
          />
        ) : (
          <Tabs defaultValue="smart" className="w-full">
            <TabsList>
              <TabsTrigger value="smart">Smart capture</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="smart" className="space-y-3">
              {fromExtension ? (
                <p className="text-xs text-primary/90">
                  Opened from extension — review all fields before saving.
                </p>
              ) : null}
              <div className="space-y-2">
                <Label>Paste a job URL or the JD text</Label>
                <Textarea
                  value={smartInput}
                  onChange={(e) => setSmartInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && smartInput.trim()) {
                      e.preventDefault();
                      handleSmartSubmit();
                    }
                  }}
                  rows={6}
                  placeholder={"https://boards.greenhouse.io/acme/jobs/123\n— or —\nPaste the job description text here…"}
                />
                <p className="text-xs text-muted-foreground">
                  We’ll fetch the page (Greenhouse, Lever, Ashby, Workday supported best-effort)
                  and let you review every field before saving. Press ⌘/Ctrl+Enter to preview.
                </p>
              </div>
              {banner?.kind === "blocked" ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-300">
                  <p className="font-medium mb-1">Couldn’t fetch {banner.url}</p>
                  <p>{banner.message}</p>
                </div>
              ) : null}
              {banner?.kind === "error" ? (
                <p className="text-xs text-destructive">{banner.message}</p>
              ) : null}
              <Button onClick={() => handleSmartSubmit()} disabled={pending || !smartInput.trim()}>
                {pending ? "Parsing…" : "Preview"}
              </Button>
            </TabsContent>

            <TabsContent value="manual">
              <form
                className="grid gap-3 sm:grid-cols-2 rounded-md border border-dashed border-border p-4"
                action={(fd) =>
                  startTransition(() => {
                    void createApplication(fd);
                  })
                }
              >
                <div className="space-y-2">
                  <Label>Job title</Label>
                  <Input name="title" required placeholder="Software Engineer" />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input name="company" required placeholder="Acme Inc" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Locations</Label>
                  <Input
                    name="locations"
                    placeholder="e.g. New York, Remote (US), Hybrid – SF"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Comma-separate multiple locations.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Job URL</Label>
                  <Input name="url" type="url" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    name="status"
                    className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                  >
                    <option value="saved">Saved</option>
                    <option value="applied">Applied</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Priority</Label>
                  <StarRating
                    name="priority"
                    value={manualPriority}
                    onChange={setManualPriority}
                    ariaLabel="Application priority"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    More stars = higher priority
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Role type</Label>
                  <select
                    name="job_type"
                    className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                  >
                    <option value="">—</option>
                    <option value="full_time">Full-time</option>
                    <option value="internship">Internship</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Cohort season</Label>
                  <select
                    name="role_season"
                    className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                  >
                    <option value="">—</option>
                    <option value="spring">Spring</option>
                    <option value="summer">Summer</option>
                    <option value="fall">Fall</option>
                    <option value="winter">Winter</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Cohort year</Label>
                  <select
                    name="role_year"
                    className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                  >
                    <option value="">—</option>
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Paste job description (optional — light AI parse)</Label>
                  <Textarea
                    name="description_raw"
                    rows={4}
                    placeholder="Paste JD for auto-extract of tech stack…"
                  />
                </div>
                <Button type="submit" disabled={pending} className="sm:col-span-2 w-fit">
                  {pending ? "Adding…" : "Add application"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
