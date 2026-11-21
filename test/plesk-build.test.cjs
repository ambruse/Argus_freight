const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {buildPlan,checkNode,runBuild} = require('../scripts/plesk-build.cjs');

test('Plesk builds both applications and verifies tracking output without editing hosting settings',()=>{
 const plan=buildPlan('/example/project');
 assert.equal(plan.length,8);
 assert.equal(plan[5].cwd,path.join('/example/project','frontend'));
 assert.ok(plan[0].args.includes('--include=dev'));
 assert.ok(plan[2].args.includes('--include=dev'));
 assert.deepEqual(plan.at(-1).args,['scripts/check-deployment.cjs','frontend/out']);
 assert.ok(!JSON.stringify(plan).includes('public_html'));
});
test('Plesk runner uses selected Node/npm and production export mode',()=>{
 const calls=[];
 runBuild({steps:buildPlan('/example/project'),node:'/opt/plesk/node/24/bin/node',env:{PATH:'/usr/bin',NODE_ENV:'development',npm_execpath:'/opt/plesk/node/24/lib/node_modules/npm/bin/npm-cli.js'},log:()=>{},run:(...args)=>{calls.push(args);return {status:0};}});
 assert.equal(calls.length,8);
 for(const [command,,options] of calls){assert.equal(command,'/opt/plesk/node/24/bin/node');assert.equal(options.env.NODE_ENV,'production');assert.equal(options.shell,false);}
 assert.match(calls[0][1][0],/npm-cli.js$/);
});
test('failed build stops before merge, verification or success notification',()=>{
 let count=0;
 assert.throws(()=>runBuild({log:()=>{},env:{},run:()=>({status:++count===6?1:0})}),/Next.js dashboard failed/);
 assert.equal(count,6);
});
test('incompatible Node versions fail before package installation',()=>{
 for(const version of ['18.20.8','20.18.0','22.12.0'])assert.throws(()=>checkNode(version),/Select Node.js/);
 for(const version of ['22.13.0','24.11.1'])assert.doesNotThrow(()=>checkNode(version));
});
