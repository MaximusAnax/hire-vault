"use client";

import type { Experience } from "@hirevault/types";
import type { DeleteAction } from "@/lib/profile/types";
import { ExperienceRow } from "./experience-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ExperienceSection({
  experiences,
  onDelete,
}: {
  experiences: Experience[];
  onDelete: DeleteAction;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Work experience</CardTitle>
        <CardDescription>Roles and accomplishments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {experiences.length === 0 ? (
          <p className="text-sm text-muted-foreground">No experiences yet.</p>
        ) : (
          experiences.map((e) => (
            <ExperienceRow key={e.id} experience={e} onDelete={onDelete} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
