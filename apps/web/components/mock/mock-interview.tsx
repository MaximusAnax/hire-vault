"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  startMockSession,
  submitMockAnswer,
  endMockSession,
} from "@/lib/mock/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface Job {
  id: string;
  title: string;
  company: string;
}

interface Session {
  id: string;
  session_type: string;
  role_title: string | null;
  score: number | null;
  feedback: string | null;
  conducted_at: string;
  jobs?: { title: string; company: string } | null;
}

export function MockInterview({ jobs, sessions }: { jobs: Job[]; sessions: Session[] }) {
  const [pending, startTransition] = useTransition();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<"behavioral" | "technical" | "mixed">("mixed");
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");

  function start() {
    startTransition(async () => {
      const res = await startMockSession(jobId || null, sessionType);
      if (res.sessionId) {
        setSessionId(res.sessionId);
        setQuestion(res.question ?? null);
        setFeedback(null);
        setAnswer("");
      }
    });
  }

  function submit() {
    if (!sessionId || !answer.trim()) return;
    startTransition(async () => {
      const res = await submitMockAnswer(sessionId, answer);
      if (res.feedback) {
        setFeedback(res.feedback.summary);
      }
      setQuestion(res.nextQuestion ?? null);
      setAnswer("");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["behavioral", "technical", "mixed"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={sessionType === t ? "default" : "outline"}
                onClick={() => setSessionType(t)}
              >
                {t}
              </Button>
            ))}
          </div>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
          >
            <option value="">General (no job)</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} @ {j.company}
              </option>
            ))}
          </select>
          <Button onClick={start} disabled={pending}>
            Start mock interview
          </Button>
        </CardContent>
      </Card>

      {sessionId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {question && (
                <p className="text-sm font-medium border-l-2 border-primary pl-3">{question}</p>
              )}
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer…"
                rows={5}
              />
              <div className="flex gap-2">
                <Button onClick={submit} disabled={pending || !answer.trim()}>
                  Submit & next question
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    startTransition(async () => {
                      await endMockSession(sessionId);
                      setSessionId(null);
                    })
                  }
                >
                  End session
                </Button>
              </div>
              {feedback && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">{feedback}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Session history</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {sessions.length === 0 ? (
            <p className="text-muted-foreground">No sessions yet.</p>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="flex justify-between border-b py-2">
                <span>
                  {s.jobs?.title ?? s.role_title} · {s.session_type}
                </span>
                <span className="text-muted-foreground">
                  Score {s.score ?? "—"} · {new Date(s.conducted_at).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
