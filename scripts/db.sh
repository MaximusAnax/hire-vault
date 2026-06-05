#!/usr/bin/env bash
# Forward-only Supabase migration wrapper for agent/harness use.
# Whitelists safe commands; blocks destructive ops unless HIREVAULT_DB_ALLOW_DESTRUCTIVE=1.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v supabase >/dev/null 2>&1; then
  echo "error: supabase CLI not installed. See https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  cat >&2 <<'EOF'
usage: scripts/db.sh <command> [args...]

allowed:
  migration new <name>
  db push [--linked]
  migration list
  db diff
  db pull
  branches create <name>
  branches list

blocked: db reset, migration repair (destructive), raw SQL with DROP/TRUNCATE/DELETE without WHERE
EOF
  exit 1
fi

cmd="$1"
shift

case "$cmd" in
  migration)
    sub="${1:-}"
    if [[ "$sub" == "new" ]]; then
      exec supabase migration new "${@:2}"
    elif [[ "$sub" == "list" ]]; then
      exec supabase migration list "${@:2}"
    fi
    ;;
  db)
    sub="${1:-}"
    shift || true
    case "$sub" in
      push) exec supabase db push "$@" ;;
      diff) exec supabase db diff "$@" ;;
      pull) exec supabase db pull "$@" ;;
      reset)
        echo "error: db reset is denylisted. Set HIREVAULT_DB_ALLOW_DESTRUCTIVE=1 and run manually if you intend this." >&2
        exit 2
        ;;
    esac
    ;;
  branches)
    sub="${1:-}"
    shift || true
    case "$sub" in
      create) exec supabase branches create "$@" ;;
      list) exec supabase branches list "$@" ;;
    esac
    ;;
esac

echo "error: command not allowlisted: $cmd $*" >&2
exit 2
