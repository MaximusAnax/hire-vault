import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="max-w-lg text-center space-y-6">
        <div className="flex justify-center">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">HireVault</h1>
        <p className="text-muted-foreground text-lg">
          Your career command center — track applications, tailor resumes, and
          prepare for interviews.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild size="lg">
            <Link href="/login">Get started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/overview">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
