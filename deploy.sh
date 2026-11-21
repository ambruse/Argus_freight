#!/bin/bash
# =============================================================
#  ARGUS — cPanel Deployment Script (SINGLE APP)
#  Called by .cpanel.yml. For Plesk, use npm run plesk:build instead.
# =============================================================

set -eo pipefail

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

# Build both applications before signalling Passenger. Never deploy source-only
# portal changes with an old tracked frontend/out export.
echo "▶ [1/5] Installing locked dependencies (including build tools)..."
cd "$DEPLOY_PATH"
npm ci --include=dev --no-audit --no-fund
npm ci --prefix backend --no-audit --no-fund
npm ci --prefix frontend --include=dev --no-audit --no-fund
if [ ! -f "backend/.env" ] && [ -f "backend/.env.cpanel" ]; then
    cp "backend/.env.cpanel" "backend/.env"
fi

echo "▶ [2/5] Building marketing pages and copying shared assets..."
npm run build:landing
npm run copy:landing

echo "▶ [3/5] Building the dashboard, including Shipment Tracking..."
NODE_ENV=production npm run build:frontend
node scripts/merge-build.cjs
node scripts/check-deployment.cjs frontend/out

echo "▶ [4/5] Applying the additive tracking migration..."
node backend/scripts/migrate-tracking.js --up
node backend/scripts/migrate-tracking.js --check

# ── 4. Copy/Merge .htaccess to public_html ───────────────────
echo ""
echo "▶ [5/5] Deploying .htaccess to public_html..."
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
