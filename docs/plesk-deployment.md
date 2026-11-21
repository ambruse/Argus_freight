# Argus Freight on Plesk

## Normal deployment: no manual build commands

Deploy the complete updated project using the existing upload/Git process, retaining the working Plesk Application Root, startup file and database environment. The updated Node process must start for the new startup code to run. If the deployment process does not restart it, **Restart App once**; restarting is not a build command.

On startup the application now:

1. Checks tracking schema readiness after the core database initialization. When needed it applies the existing additive migration under a MySQL named lock, verifies the result, and only then allows tracking requests. A failed migration returns an unavailable response and can retry on a later request after a 30-second cooldown.
2. Launches a background build worker. It fingerprints the browser sources and builds new or missing releases in an isolated `.argus-build/release-*` directory. A verified unchanged release is skipped.
3. Installs locked browser build dependencies, builds Vite and Next.js, merges their exports and checks required pages and referenced browser assets. The running backend's dependencies and environment files are not replaced. Only `NEXT_PUBLIC_*` and `VITE_*` values from local environment files are copied into the temporary build; environment variables set by the host are inherited.
4. Copies the verified output into `frontend/out`, publishing assets before HTML and keeping old hashed assets for browsers already open. Individual files are replaced by rename; this is not an atomic switch of the entire directory. Build/verification/copy failures before publication preserve the existing files. A filesystem failure during final renames can leave a partially published release and is logged as a failed attempt.
5. Serves the completed tracking page without another restart. While its first build is running, the missing-page response refreshes every 20 seconds. A failed build displays an unavailable message, never a false success or the marketing homepage.

The worker retries failures after five minutes, up to three attempts per source revision. Details appear in the application's server logs with `[Auto preparation]` or `[Tracking preparation]`. State is private to `.argus-build/state.json`. A new source revision resets the build attempt count on the next application start. Normal local `npm run dev` and `NODE_ENV=development/test` do not trigger browser builds. `ARGUS_AUTO_PREPARE=0` explicitly disables browser preparation for hosts using an external build pipeline; schema preparation still checks/applies the existing additive tracking migration.

The host needs the complete source and lockfiles, Node **22.13+ in the 22 series or 24+**, registry access, disk space, memory for a Next.js build, and write permission to the project/export directories. The database user needs permission to create the tracking tables. Automation cannot bypass missing host permissions or an incompatible database. Each build subprocess has a 15-minute timeout. No new package dependency was added.

## Optional diagnostics and manual recovery

These commands remain available but are not required for normal startup preparation:

- `npm run plesk:check` validates the exported pages and their referenced assets.
- `node scripts/auto-prepare.cjs --worker` invokes the isolated preparation worker directly, with the same revision and retry rules.
- `npm run plesk:migrate` explicitly applies/checks the existing additive migration.
- `npm run plesk:build` performs the full build directly in the checkout, including backend dependency installation. Use a separate release/staging checkout for that manual workflow; it does not provide the automatic worker's build isolation.

The Plesk aliases exist in both root and backend `package.json`. In Plesk's **Run script** control enter the script name, such as `plesk:check`; in a shell use the complete `npm run plesk:check` command. `.cpanel.yml` and `deploy.sh` are cPanel-specific and are not the Plesk deployment workflow.

## Startup and static files

Keep the working server configuration. For a deliberate fresh setup, the repository root contains optional `app.cjs`, a CommonJS startup wrapper which loads the existing backend. Existing backend-root installations can keep `server.js`. The public static export is `frontend/out`; do not expose the source directory, backend environment, or `.argus-build` as public static files. Preserve forwarding of API and Socket.IO traffic to Node.

This change has isolated automated coverage for build publication, failed builds, concurrent starts, migrations and the missing-page response. A complete dependency installation, real MySQL migration and live Plesk deployment must still be verified on the host; they were not available in the local verification environment.

Official Plesk reference: https://docs.plesk.com/en-US/obsidian/administrator-guide/website-management/hosting-nodejs-applications.76652/
