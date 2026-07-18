#!/bin/bash
# =============================================================
#  ARGUS — cPanel Deployment Script (SINGLE APP)
#  Called by .cpanel.yml on every git push.
# =============================================================

set -e

DEPLOY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_HTML="${DEPLOY_PATH}/../public_html"

echo ""
echo "=================================================="
echo "  ARGUS Deployment — $(date)"
echo "  Deploy path : $DEPLOY_PATH"
echo "=================================================="

# ── 1. Install backend dependencies ──────────────────────────
echo ""
echo "▶ [1/4] Installing backend dependencies..."
cd "$DEPLOY_PATH/backend"
npm install --legacy-peer-deps 2>&1 | tail -5
echo "✅  Backend deps done."

# ── 2. Install & build Next.js frontend (static export) ───────
echo ""
echo "▶ [2/4] Installing frontend dependencies..."
cd "$DEPLOY_PATH/frontend"
npm install --legacy-peer-deps 2>&1 | tail -5

echo "▶ [2/4] Building Next.js (static export → frontend/out/)..."
NODE_ENV=production npm run build 2>&1 | tail -20
echo "✅  Frontend static build done → frontend/out/"

# ── 3. Build Vite landing page ────────────────────────────────
echo ""
echo "▶ [3/4] Building Vite landing page (→ dist/)..."
cd "$DEPLOY_PATH"
npm install --legacy-peer-deps 2>&1 | tail -5
npm run build:landing 2>&1 | tail -10
echo "✅  Landing page built → dist/"

# ── 4. Copy .htaccess to public_html ─────────────────────────
echo ""
echo "▶ [4/4] Copying .htaccess to public_html..."
cp "$DEPLOY_PATH/.htaccess" "$PUBLIC_HTML/.htaccess"
echo "✅  .htaccess deployed."

# ── Restart the ONE Node.js app (Passenger signal) ───────────
echo ""
echo "▶ Restarting Express app..."
mkdir -p "$DEPLOY_PATH/backend/tmp"
touch "$DEPLOY_PATH/backend/tmp/restart.txt"
echo "✅  Express app restart signalled."

echo ""
echo "=================================================="
echo "  ✅ Deployment complete — $(date)"
echo "  Your site is live at https://yourdomain.com"
echo "=================================================="
