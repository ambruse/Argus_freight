'use strict';
// Background preparation for deployments which upload source but do not run a
// Plesk build command. Never install into the running application's dependencies.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { buildPlan, runBuild, checkNode } = require('./plesk-build.cjs');
const { checkDeployment } = require('./check-deployment.cjs');
const ROOT = path.resolve(__dirname, '..');
const INPUTS = ['package.json','package-lock.json','index.html','vite.config.js','.htaccess','src','shared','scripts','public','frontend'];
const EXCLUDED = new Set(['node_modules','out','dist','.next','.git','.DS_Store','uploads','tmp']);
function included(relative) {
  return !relative.split(path.sep).some(part => EXCLUDED.has(part) || part === '.env' || part.startsWith('.env.') || part.endsWith('.log') || part.endsWith('.tsbuildinfo'));
}
function inputFiles(root) {
  const files=[];
  const visit = relative => {
    const file=path.join(root,relative);
    if(!included(relative)||!fs.existsSync(file))return;
    const stat=fs.lstatSync(file);
    // Do not copy symlinks to secrets or paths outside the source checkout.
    if(stat.isSymbolicLink())throw new Error(`Build input must not be a symlink: ${relative}`);
    if(stat.isDirectory())for(const name of fs.readdirSync(file).sort())visit(path.join(relative,name));
    else if(stat.isFile())files.push(relative);
  };
  INPUTS.forEach(visit);return files.sort();
}
function publicEnvironment(root) {
  const result = {};
  for (const directory of ['', 'frontend']) {
    for (const name of ['.env', '.env.production', '.env.local', '.env.production.local']) {
      const file = path.join(root, directory, name);
      if (!fs.existsSync(file)) continue;
      // Preserve browser configuration without copying database credentials.
      result[path.join(directory, name)] = fs.readFileSync(file, 'utf8').split(/\r?\n/)
        .filter(line => /^(?:NEXT_PUBLIC_|VITE_)[A-Z0-9_]+\s*=/.test(line)).join('\n');
    }
  }
  return result;
}
function fingerprint(root=ROOT) {
  const hash=crypto.createHash('sha256');
  for(const file of inputFiles(root)){hash.update(file);hash.update('\0');hash.update(fs.readFileSync(path.join(root,file)));}
  hash.update(JSON.stringify(publicEnvironment(root)));
  return hash.digest('hex');
}
function readState(root=ROOT) {
  try{return JSON.parse(fs.readFileSync(path.join(root,'.argus-build/state.json'),'utf8'));}catch{return {};}
}
function writeState(root,state) {
  const folder=path.join(root,'.argus-build');fs.mkdirSync(folder,{recursive:true,mode:0o700});
  const temp=path.join(folder,`state-${process.pid}.tmp`);
  fs.writeFileSync(temp,JSON.stringify(state),{mode:0o600});fs.renameSync(temp,path.join(folder,'state.json'));
}
function acquireLock(root=ROOT) {
  const dir=path.join(root,'.argus-build'),lock=path.join(dir,'lock');
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  try { fs.mkdirSync(lock); } catch (error) {
    if(error.code!=='EEXIST')throw error;
    // Serialize stale-lock recovery so two Passenger workers cannot reclaim
    // each other's new lock. A short-lived recovery lock is conservative.
    const recovery=path.join(dir,'recovering');
    try { fs.mkdirSync(recovery); } catch { return null; }
    try {
      let owner;
      try { owner=JSON.parse(fs.readFileSync(path.join(lock,'owner.json'),'utf8')); } catch {
        if(!fs.existsSync(lock)||Date.now()-fs.statSync(lock).mtimeMs<30000)return null;
      }
      if(owner) {
        if(!Number.isInteger(owner.pid)||owner.pid<1)return null;
        try { process.kill(owner.pid,0);return null; } catch(error) { if(error.code!=='ESRCH')return null; }
      }
      fs.rmSync(lock,{recursive:true,force:true});
      try { fs.mkdirSync(lock); } catch(error) { if(error.code==='EEXIST')return null;throw error; }
    } finally { fs.rmdirSync(recovery); }
  }
  fs.writeFileSync(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid}));
  return ()=>fs.rmSync(lock,{recursive:true,force:true});
}
function snapshot(root,stage) {
  for (const [file, value] of Object.entries(publicEnvironment(root))) {
    const target = path.join(stage, file);
    fs.mkdirSync(path.dirname(target), {recursive:true});
    fs.writeFileSync(target, value, {mode:0o600});
  }
  for(const file of inputFiles(root)){
    const target=path.join(stage,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);
  }
}
function publish(stagedOut,destination,{copy=fs.copyFileSync,rename=fs.renameSync}={}) {
  // Prepare every file before publishing any. Hashed assets go first; HTML and
  // Next navigation payloads go last. Keep old assets for already-open browsers.
  const files=[];
  const walk=dir=>{for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(item.isFile())files.push(path.relative(stagedOut,file));}};
  walk(stagedOut);
  files.sort((a,b)=>Number(/\.(html|txt|json)$/.test(a))-Number(/\.(html|txt|json)$/.test(b))||a.localeCompare(b));
  const pending=[];
  try{
    for(const relative of files){const target=path.join(destination,relative),temporary=target+'.argus-'+process.pid+'.tmp';fs.mkdirSync(path.dirname(target),{recursive:true});pending.push({target,temporary});copy(path.join(stagedOut,relative),temporary);}
    for(const file of pending)rename(file.temporary,file.target);
  }finally{for(const file of pending)fs.rmSync(file.temporary,{force:true});}
}
function needsBuild(root,revision,state=readState(root)) {
  if(state.revision===revision&&state.phase==='ready'&&fs.existsSync(path.join(root,'frontend/out/shipment-tracking.html')))return false;
  if(state.revision===revision&&state.phase==='failed'&&(state.attempts>=3||Date.now()<state.retryAfter))return false;
  return true;
}
async function prepare({root=ROOT,build=runBuild,verify=checkDeployment,promote=publish,log=console.log}={}) {
  const release=acquireLock(root);if(!release)return {phase:'busy'};
  let stage,revision,attempts;
  try{
    revision=fingerprint(root);const old=readState(root);
    if(!needsBuild(root,revision,old))return old;
    attempts=old.revision===revision?(old.attempts||0)+1:1;
    writeState(root,{revision,phase:'building',attempts,workerPid:process.pid,startedAt:Date.now()});
    checkNode();
    stage=fs.mkdtempSync(path.join(root,'.argus-build/release-'));
    snapshot(root,stage);
    // Backend is already running; only build the two browser applications in
    // the isolated checkout. Avoid touching its live node_modules or .env.
    const steps=buildPlan(stage).filter(step=>step.label!=='Install backend dependencies');
    await build({steps,log});
    verify(path.join(stage,'frontend/out'));
    if(fingerprint(root)!==revision)throw new Error('Source changed during preparation; retaining the current website.');
    promote(path.join(stage,'frontend/out'),path.join(root,'frontend/out'));
    const state={revision,phase:'ready',attempts,completedAt:Date.now()};writeState(root,state);
    log('[Auto preparation] Tracking dashboard is ready.');return state;
  }catch(error){
    writeState(root,{revision,phase:'failed',attempts:attempts||1,retryAfter:Date.now()+300000});
    log('[Auto preparation] Failed: '+error.message);throw error;
  }finally{if(stage)fs.rmSync(stage,{recursive:true,force:true});release();}
}
function startAutomaticPreparation({root=ROOT,env=process.env,spawnProcess=spawn,log=console.log}={}) {
  if(env.ARGUS_AUTO_PREPARE==='0'||env.npm_lifecycle_event==='dev'||['test','development'].includes(env.NODE_ENV))return ()=>{};
  if(env.NODE_ENV!=='production'&&fs.existsSync(path.join(root,'frontend/out/shipment-tracking.html')))return ()=>{};
  let child=null,stopped=false;
  const launch=(initial=false)=>{
    if(stopped||child)return;
    const state=readState(root);
    // Always fingerprint once per server start, including after deploying new
    // source over a previous failed release. Later ticks only recover failures.
    if(!initial) {
      if(state.phase==='ready'&&fs.existsSync(path.join(root,'frontend/out/shipment-tracking.html')))return;
      if(state.phase==='failed'&&(state.attempts>=3||Date.now()<state.retryAfter))return;
    }
    const worker=spawnProcess(process.execPath,[path.join(root,'scripts/auto-prepare.cjs'),'--worker'],{
      cwd:root,env:{...env,PATH:path.dirname(process.execPath)+path.delimiter+(env.PATH||'')},stdio:'inherit',
    });
    child=worker;
    worker.on('error',error=>{log('[Auto preparation] Could not launch worker: '+error.message);child=null;});
    worker.on('exit',(code,signal)=>{
      child=null;
      // Also handle a killed/OOM worker which never reached its own catch block.
      const latest=readState(root);
      if(latest.phase==='building'&&latest.workerPid===worker.pid) {
        try { writeState(root,{...latest,phase:'failed',retryAfter:Date.now()+300000}); }
        catch(error) { log('[Auto preparation] Could not save failure state: '+error.message); }
        log(`[Auto preparation] Worker stopped before completion (${signal||code}).`);
      }
    });
  };
  const initial=setTimeout(()=>launch(true),1000);initial.unref?.();
  const retry=setInterval(()=>launch(),30000);retry.unref?.();
  return ()=>{stopped=true;clearTimeout(initial);clearInterval(retry);};
}
if(require.main===module&&process.argv.includes('--worker'))prepare().catch(error=>{
  console.error('[Auto preparation]',error.message);process.exitCode=1;
});
module.exports={fingerprint,inputFiles,snapshot,publish,needsBuild,readState,writeState,acquireLock,prepare,startAutomaticPreparation};
