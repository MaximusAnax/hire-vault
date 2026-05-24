"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  generateQuestionsForJob,
  personalizeQuestionAnswer,
  refineQuestionAnswer,
  ratePractice,
  fetchCompanyResearch,
} from "@/lib/interviews/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface Job {
  id: string;
  title: string;
  company: string;
}

interface Question {
  id: string;
  job_id?: string;
  question: string;
  category: string;
  difficulty: number | null;
  personalized_answer: string | null;
  practiced: boolean;
  practice_rating: number | null;
  technical_topics: string[];
}

export function InterviewPrep({
  jobs,
  questions,
  initialJobId,
}: {
  jobs: Job[];
  questions: Question[];
  initialJobId?: string;
}) {
  const [jobId, setJobId] = useState(initialJobId ?? jobs[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [flashIndex, setFlashIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [draft, setDraft] = useState("");
  const jobQuestions = jobId
    ? questions.filter((q) => q.job_id === jobId)
    : questions;

  const current = jobQuestions[flashIndex];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select role</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {jobs.map((j) => (
            <Button
              key={j.id}
              variant={jobId === j.id ? "default" : "outline"}
              size="sm"
              onClick={() => setJobId(j.id)}
            >
              {j.title} @ {j.company}
            </Button>
          ))}
          {jobId && (
            <>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await generateQuestionsForJob(jobId);
                  })
                }
              >
                Generate questions
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const j = jobs.find((x) => x.id === jobId);
                    if (j) await fetchCompanyResearch(j.company);
                  })
                }
              >
                Company research (stub)
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {current && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Practice mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <p className="text-xs text-muted-foreground uppercase">{current.category}</p>
                <p className="text-lg font-medium mt-1">{current.question}</p>
                {current.technical_topics?.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Topics: {current.technical_topics.join(", ")}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowAnswer(!showAnswer)}>
                {showAnswer ? "Hide" : "Reveal"} answer
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  startTransition(async () => {
                    await personalizeQuestionAnswer(current.id);
                  })
                }
                disabled={pending}
              >
                Generate from profile
              </Button>
            </div>
            {showAnswer && (
              <p className="text-sm bg-muted/50 rounded-md p-3">
                {current.personalized_answer ?? "No answer yet — generate from profile."}
              </p>
            )}
            <Textarea
              placeholder="Draft your answer for AI refinement…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={!draft.trim() || pending}
              onClick={() =>
                startTransition(async () => {
                  await refineQuestionAnswer(current.id, draft);
                  setDraft("");
                })
              }
            >
              Refine with AI
            </Button>
            <div className="flex gap-1 items-center">
              <span className="text-xs text-muted-foreground mr-2">Self-rating:</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={current.practice_rating === n ? "default" : "ghost"}
                  onClick={() =>
                    startTransition(async () => {
                      await ratePractice(current.id, n);
                    })
                  }
                >
                  {n}
                </Button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={flashIndex === 0}
                onClick={() => setFlashIndex((i) => Math.max(0, i - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={flashIndex >= jobQuestions.length - 1}
                onClick={() => setFlashIndex((i) => Math.min(jobQuestions.length - 1, i + 1))}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Question bank</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm max-h-80 overflow-auto">
          {questions.length === 0 ? (
            <p className="text-muted-foreground">Generate questions for a job to begin.</p>
          ) : (
            questions.map((q) => (
              <div key={q.id} className="border-b border-border pb-2">
                <span className="text-xs text-muted-foreground">{q.category}</span>
                <p>{q.question}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
