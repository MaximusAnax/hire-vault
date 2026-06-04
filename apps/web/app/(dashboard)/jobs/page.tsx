import { redirect } from "next/navigation";

/** Jobs library merged into Applications for a leaner nav. */
export default function JobsPage() {
  redirect("/applications");
}
