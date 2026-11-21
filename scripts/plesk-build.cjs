'use strict';
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

// Resolve from this file, not Plesk's current Application Root. The aliases in
// both package.json files work for existing backend-root installations as well.
function buildPlan(directory = root) {
  return [
    { label: 'Install root build tools', tool: 'npm', args: ['ci', '--include=dev', '--no-audit', '--no-fund'], cwd: directory },
    { label: 'Install backend dependencies', tool: 'npm', args: ['ci', '--no-audit', '--no-fund'], cwd: path.join(directory, 'backend') },
    { label: 'Install dashboard build tools', tool: 'npm', args: ['ci', '--include=dev', '--no-audit', '--no-fund'], cwd: path.join(directory, 'frontend') },
    { label: 'Build marketing pages', tool: 'npm', args: ['run', 'build:landing'], cwd: directory },
    { label: 'Copy shared website assets', tool: 'node', args: ['scripts/copy-landing.cjs'], cwd: directory },
    { label: 'Build Next.js dashboard', tool: 'npm', args: ['run', 'build'], cwd: path.join(directory, 'frontend') },
    { label: 'Merge the two exports', tool: 'node', args: ['scripts/merge-build.cjs'], cwd: directory },
    { label: 'Verify tracking HTML and browser assets', tool: 'node', args: ['scripts/check-deployment.cjs', 'frontend/out'], cwd: directory },
  ];
}
function checkNode(version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  if (!(major === 22 && minor >= 13 || major >= 24)) {
    throw new Error(`Selected Node.js ${version} is too old for this project's build tools. Select Node.js 22.13+ or 24+ in Plesk.`);
  }
}
function runBuild({ steps = buildPlan(), run = spawnSync, env = process.env, node = process.execPath, log = console.log } = {}) {
  const selectedEnv = { ...env, NODE_ENV: 'production', PATH: path.dirname(node) + path.delimiter + (env.PATH || '') };
  for (const [index, step] of steps.entries()) {
    log(`[${index + 1}/${steps.length}] ${step.label}`);
    // Plesk's Run Script supplies npm_execpath. Keep subprocesses on the same
    // selected Node runtime instead of accidentally using the system Node.
    const npmViaNode = step.tool === 'npm' && env.npm_execpath;
    const command = step.tool === 'node' || npmViaNode ? node : process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const args = npmViaNode ? [env.npm_execpath, ...step.args] : step.args;
    const result = run(command, args, { cwd: step.cwd, env: selectedEnv, stdio: 'inherit', shell: false, timeout: 15 * 60 * 1000, killSignal: 'SIGKILL' });
    if (result.error || result.status !== 0) {
      throw new Error(`${step.label} failed${result.error ? ': ' + result.error.message : ` (exit ${result.status ?? result.signal})`}. The website build did not complete. Check the error above; do not treat this as a successful deployment.`);
    }
  }
  log('Build verified: frontend/out/shipment-tracking.html and its referenced assets exist.');
}
if (require.main === module) {
  try {
    checkNode();
    if (process.argv.includes('--plan')) console.log(JSON.stringify(buildPlan(), null, 2));
    else runBuild();
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { buildPlan, checkNode, runBuild };
