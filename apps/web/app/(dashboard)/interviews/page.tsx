import { InterviewPrep } from "@/components/interviews/interview-prep";
import { getInterviewJobs, getAllQuestions } from "@/lib/interviews/queries";

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const params = await searchParams;
  const [jobs, questions] = await Promise.all([getInterviewJobs(), getAllQuestions()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Interview prep</h1>
        <p className="text-muted-foreground">
          Questions from job descriptions, personalized answers, practice flashcards, and company research.
        </p>
      </div>
      <InterviewPrep
        jobs={jobs}
        questions={questions.map((q) => ({
          id: q.id,
          job_id: q.job_id,
          question: q.question,
          category: q.category,
          difficulty: q.difficulty,
          personalized_answer: q.personalized_answer,
          practiced: q.practiced,
          practice_rating: q.practice_rating,
          technical_topics: q.technical_topics ?? [],
        }))}
        initialJobId={params.job}
      />
    </div>
  );
}
