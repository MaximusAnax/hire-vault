import Link from "next/link";

export function ImportHealthBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Link
      href="/profile/import"
      className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
    >
      {count === 1 ? "1 import conflict" : `${count} import conflicts`}
    </Link>
  );
}
