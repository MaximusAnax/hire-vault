import { revalidatePath } from "next/cache";

export function revalidateProfile() {
  revalidatePath("/profile");
}

export function parseTargetRoles(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
