#!/bin/bash
# =============================================================
#  ARGUS — cPanel Deployment Script (SINGLE APP)
#  Called by .cpanel.yml on every git push.
# =============================================================

set -e

DEPLOY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Robust resolution of public_html directory for cPanel
if [ -n "$USER" ] && [ -d "/home/$USER/public_html" ]; then
    PUBLIC_HTML="/home/$USER/public_html"
elif [ -d "$HOME/public_html" ]; then
    PUBLIC_HTML="$HOME/public_html"
elif [ -d "${DEPLOY_PATH}/../public_html" ]; then
    PUBLIC_HTML="${DEPLOY_PATH}/../public_html"
else
    PUBLIC_HTML="${DEPLOY_PATH}/../public_html"
fi

echo ""
echo "=================================================="
echo "  ARGUS Deployment — $(date)"
echo "  Deploy path : $DEPLOY_PATH"
echo "=================================================="

# ── 1. Install backend dependencies ──────────────────────────
echo ""
echo "▶ [1/4] Installing backend dependencies..."
cd "$DEPLOY_PATH/backend"
if [ -f ".env.cpanel" ]; then
    echo "💡 Ensuring .env file is configured from .env.cpanel..."
    cp ".env.cpanel" ".env"
fi
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

# Merge landing page build into frontend/out static export directory
echo "▶ Merging landing page build into frontend/out..."
node scripts/merge-build.cjs
echo "✅  Merge complete."

# ── 4. Copy/Merge .htaccess to public_html ───────────────────
echo ""
echo "▶ [4/4] Deploying .htaccess to public_html..."
DEST_HTACCESS="$PUBLIC_HTML/.htaccess"
SRC_HTACCESS="$DEPLOY_PATH/.htaccess"

if [ -f "$DEST_HTACCESS" ]; then
    # Check if the existing .htaccess contains cPanel Passenger rules
    if grep -q -i "Passenger" "$DEST_HTACCESS"; then
        echo "💡 Found Passenger configuration in existing .htaccess. Merging..."
        # Extract Passenger configuration lines
        grep -i "Passenger" "$DEST_HTACCESS" > "$DEPLOY_PATH/.htaccess.passenger"
        
        # Create a new .htaccess with passenger config at the top
        cat "$DEPLOY_PATH/.htaccess.passenger" > "$DEPLOY_PATH/.htaccess.temp"
        echo "" >> "$DEPLOY_PATH/.htaccess.temp"
        
        # Add the contents of our repo .htaccess but comment out the port-based proxy lines
        # since Passenger handles routing internally
        sed -E 's/^([^#]*RewriteRule .* http:\/\/127\.0\.0\.1:.*)/# \1 # disabled for Passenger/' "$SRC_HTACCESS" >> "$DEPLOY_PATH/.htaccess.temp"
        
        # Deploy the merged file
        cp "$DEPLOY_PATH/.htaccess.temp" "$DEST_HTACCESS"
        rm -f "$DEPLOY_PATH/.htaccess.passenger" "$DEPLOY_PATH/.htaccess.temp"
        echo "✅ Merged Passenger configuration and deployed .htaccess."
    else
        cp "$SRC_HTACCESS" "$DEST_HTACCESS"
        echo "✅ .htaccess copied successfully."
    fi
else
    # Make sure parent directory exists if it's a fallback path
    mkdir -p "$(dirname "$DEST_HTACCESS")"
    cp "$SRC_HTACCESS" "$DEST_HTACCESS"
    echo "✅ .htaccess copied successfully (new file)."
fi

# ── Restart the ONE Node.js app (Passenger signal) ───────────
echo ""
echo "▶ Restarting Express app..."
mkdir -p "$DEPLOY_PATH/backend/tmp"
touch "$DEPLOY_PATH/backend/tmp/restart.txt"
echo "✅  Express app restart signalled."

echo ""
echo "=================================================="
echo "  ✅ Deployment complete — $(date)"
echo "  Your site is live at https://argusshipping.co"
echo "=================================================="
