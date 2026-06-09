"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfileId } from "@/lib/profile/get-profile";

export async function updateWeeklyApplicationGoal(goal: number) {
  const profileId = await requireProfileId();
  const sanitized = Math.min(50, Math.max(1, Math.round(goal)));

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ weekly_application_goal: sanitized })
    .eq("id", profileId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/overview");
  return { success: true };
}
