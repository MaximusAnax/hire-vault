"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Briefcase,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Mic,
  Search,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useUiStore } from "@/lib/stores/ui-store";

const mainNav = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/jobs", label: "Jobs", icon: Search },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/interviews", label: "Interviews", icon: MessageSquare },
  { href: "/mock", label: "Mock", icon: Mic },
];

const bottomNav = [{ href: "/settings", label: "Settings", icon: Settings }];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const setCommandOpen = useUiStore((s) => s.setCommandPaletteOpen);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-3">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        {!collapsed && (
          <span className="font-semibold tracking-tight">HireVault</span>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-1">
          {mainNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-sidebar-accent/50",
                  active && "bg-sidebar-accent text-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <Separator className="my-3" />
        <nav className="flex flex-col gap-1">
          {bottomNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-sidebar-accent/50",
                  active && "bg-sidebar-accent"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-2 space-y-1">
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setCommandOpen(true)}
          >
            <span className="text-xs">⌘K Command palette</span>
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={toggle} className="w-full">
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
        </Button>
      </div>
    </motion.aside>
  );
}
