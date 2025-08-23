#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   SUPABASE_ACCESS_TOKEN=... \
#   SUPABASE_PROJECT_REF=afsmkbuspfmhenrccwru \
#   SUPABASE_URL=https://afsmkbuspfmhenrccwru.supabase.co \
#   SUPABASE_SERVICE_ROLE_KEY=... \
#   AIFACESWAP_API_KEY=... \
#   bash scripts/deploy.sh

required_vars=(SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY AIFACESWAP_API_KEY)
for v in "${required_vars[@]}"; do
  if [ -z "${!v:-}" ]; then
    echo "Missing required env var: $v" >&2
    exit 1
  fi
done

# Ensure deps
if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required" >&2
  exit 1
fi

echo "==> Supabase CLI login"
# Non-interactive login
npx -y supabase@latest login --token "$SUPABASE_ACCESS_TOKEN"

echo "==> Link to project: $SUPABASE_PROJECT_REF"
npx -y supabase@latest link --project-ref "$SUPABASE_PROJECT_REF"

echo "==> Set Edge Function secrets"
npx -y supabase@latest secrets set \
  --project-ref "$SUPABASE_PROJECT_REF" \
  AIFACESWAP_API_KEY="$AIFACESWAP_API_KEY" \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

echo "==> Apply database migrations"
npx -y supabase@latest db push

echo "==> Deploy Edge Functions"
# aifaceswap proxy + webhook
npx -y supabase@latest functions deploy aifaceswap-proxy --project-ref "$SUPABASE_PROJECT_REF"
npx -y supabase@latest functions deploy aifaceswap-webhook --project-ref "$SUPABASE_PROJECT_REF"
# task-status (read-only)
npx -y supabase@latest functions deploy task-status --project-ref "$SUPABASE_PROJECT_REF"
# optional callback (kept for backward compatibility)
if [ -d supabase/functions/aifaceswap-callback ]; then
  npx -y supabase@latest functions deploy aifaceswap-callback --project-ref "$SUPABASE_PROJECT_REF"
fi

echo "==> Deployment complete"