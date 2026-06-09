import Link from "next/link";

export function ImportHealthBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Link
      href="/profile/import"
      className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
    >
      {count === 1 ? "1 import conflict" : `${count} import conflicts`}
    </Link>
  );
}
