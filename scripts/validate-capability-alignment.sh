#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REQUIRED_FIELDS=(
  "Capability:"
  "Sub Capability:"
  "Owner Surface:"
  "Domain Entities:"
  "System Invariants:"
)

if git rev-parse --verify origin/main >/dev/null 2>&1; then
  BASE_REF="origin/main"
elif git rev-parse --verify main >/dev/null 2>&1; then
  BASE_REF="main"
else
  BASE_REF="HEAD~1"
fi

RANGE_CHANGED=$(git diff --name-only "$BASE_REF...HEAD" || true)
if [[ -z "$RANGE_CHANGED" ]]; then
  RANGE_CHANGED=$(git diff --name-only HEAD~1...HEAD || true)
fi

WORKTREE_CHANGED=$(git status --porcelain | awk '{print $2}' || true)

CHANGED_FILES=$(printf "%s\n%s\n" "$RANGE_CHANGED" "$WORKTREE_CHANGED" | sed '/^$/d' | sort -u)

TARGET_FILES=()
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  if [[ "$file" == docs/features/*.md ]] || [[ "$file" == docs/*FLOW*.md ]] || [[ "$file" == docs/*QA_CHECKLIST*.md ]] || [[ "$file" == docs/features/*MASTERPLAN*.md ]]; then
    TARGET_FILES+=("$file")
  fi
done <<< "$CHANGED_FILES"

if [[ ${#TARGET_FILES[@]} -eq 0 ]]; then
  echo "No changed feature-flow docs detected. Capability alignment check skipped."
  exit 0
fi

FAILURES=0
for file in "${TARGET_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    continue
  fi

  echo "Checking capability alignment fields in $file"

  for field in "${REQUIRED_FIELDS[@]}"; do
    if ! grep -Fq "$field" "$file"; then
      echo "  Missing required field: $field"
      FAILURES=$((FAILURES + 1))
    fi
  done

  if ! grep -Fq "Reference:" "$file"; then
    echo "  Missing required field: Reference:"
    FAILURES=$((FAILURES + 1))
  elif ! awk '
    BEGIN { in_ref=0; has_link=0 }
    /^Reference:[[:space:]]*$/ { in_ref=1; next }
    in_ref && /^[[:space:]]*-[[:space:]]*`[^`]+`[[:space:]]*$/ { has_link=1; next }
    in_ref && /^---[[:space:]]*$/ { exit }
    in_ref && /^##[[:space:]]+/ { exit }
    in_ref && /^[[:space:]]*$/ { next }
    END { exit(has_link ? 0 : 1) }
  ' "$file"; then
    echo "  Reference section must include at least one non-empty backticked doc link bullet"
    FAILURES=$((FAILURES + 1))
  fi
done

if [[ $FAILURES -gt 0 ]]; then
  echo "Capability alignment validation failed with $FAILURES issue(s)."
  exit 1
fi

echo "Capability alignment validation passed."
