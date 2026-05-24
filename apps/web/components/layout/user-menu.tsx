"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src="" alt="User" />
        <AvatarFallback>HV</AvatarFallback>
      </Avatar>
      <Button variant="ghost" size="sm" onClick={signOut}>
        <LogOut className="h-4 w-4 mr-1" />
        Sign out
      </Button>
    </div>
  );
}
