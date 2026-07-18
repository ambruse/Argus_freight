#!/bin/bash
# =============================================================
#  ARGUS — cPanel Deployment Script
#  Called by .cpanel.yml on every git push.
#
#  BEFORE FIRST DEPLOY — set these variables:
#    CPANEL_USER  = your cPanel username  (e.g. argusco)
#    DEPLOY_PATH  = absolute path to this repo on the server
#                  (e.g. /home/argusco/argus)
#    PUBLIC_HTML  = your public_html path
#                  (e.g. /home/argusco/public_html)
# =============================================================

set -e   # exit immediately on any error

# ── Configurable paths (edit these) ──────────────────────────
DEPLOY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_HTML="${DEPLOY_PATH}/../public_html"

echo ""
echo "=================================================="
echo "  ARGUS Deployment — $(date)"
echo "  Deploy path : $DEPLOY_PATH"
echo "  Public HTML : $PUBLIC_HTML"
echo "=================================================="

# ── 1. Install backend dependencies ──────────────────────────
echo ""
echo "▶ [1/4] Installing backend dependencies..."
cd "$DEPLOY_PATH/backend"
npm install --include=dev --legacy-peer-deps --prefer-offline 2>&1 | tail -5
echo "✅  Backend deps done."

# ── 2. Install & build Next.js frontend ──────────────────────
echo ""
echo "▶ [2/4] Installing frontend dependencies..."
cd "$DEPLOY_PATH/frontend"
npm install --include=dev --legacy-peer-deps --prefer-offline 2>&1 | tail -5

echo "▶ [2/4] Building Next.js frontend..."
NODE_ENV=production npm run build 2>&1 | tail -20
echo "✅  Frontend build done."

# ── 3. Build Vite landing page ────────────────────────────────
echo ""
echo "▶ [3/4] Building landing page..."
cd "$DEPLOY_PATH"
npm install --legacy-peer-deps --prefer-offline 2>&1 | tail -5
npm run build:landing 2>&1 | tail -10

# Copy built landing page into public_html
echo "▶ [3/4] Copying landing page to public_html..."
mkdir -p "$PUBLIC_HTML/landing"
cp -r "$DEPLOY_PATH/dist/"* "$PUBLIC_HTML/"
echo "✅  Landing page deployed."

# ── 4. Restart Node.js apps (Passenger signal) ───────────────
echo ""
echo "▶ [4/4] Restarting Node.js applications..."

# Signal Passenger to restart the backend app
mkdir -p "$DEPLOY_PATH/backend/tmp"
touch "$DEPLOY_PATH/backend/tmp/restart.txt"
echo "✅  Backend restart signalled."

# Signal Passenger to restart the frontend app
mkdir -p "$DEPLOY_PATH/frontend/tmp"
touch "$DEPLOY_PATH/frontend/tmp/restart.txt"
echo "✅  Frontend restart signalled."

echo ""
echo "=================================================="
echo "  ✅ Deployment complete — $(date)"
echo "=================================================="
