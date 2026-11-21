const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const {trackerCanRequest} = require('../src/middleware/trackerAccess');

test('Tracker API allowlist permits operations and own account settings only', () => {
  for (const [method, path] of [
    ['GET','/api/shipments/tracking'], ['POST','/api/shipments/tracking'],
    ['GET','/api/shipments/tracking/ARG-123'], ['POST','/api/shipments/tracking/bulk'],
    ['PATCH','/api/shipments/ARG-123/tracking'], ['GET','/api/shipments/ARG-123/tracking/events'],
    ['POST','/api/shipments/ARG-123/tracking/events'], ['GET','/api/auth/me'],
    ['GET','/api/auth/profile'], ['POST','/api/auth/profile'], ['POST','/api/auth/change-password'],
    ['POST','/api/auth/verify-password'],
  ]) assert.equal(trackerCanRequest(path,method),true,`${method} ${path}`);
  for (const [method,path] of [
    ['GET','/api/shipments'],['DELETE','/api/shipments/ARG-123'],
    ['GET','/api/auth/admin/users'],['POST','/api/auth/email-settings'],
    ['GET','/api/live-pricing/rates'],['GET','/api/dashboard'],
    ['GET','/api/shipments/ARG-123/tracking/audit'],
    ['PATCH','/api/shipments/ARG-123/tracking/events/1'],
    ['DELETE','/api/shipments/tracking'], ['POST','/api/shipments/tracking/ARG-123'],
    ['GET','/api/auth/profile/2'],
  ]) assert.equal(trackerCanRequest(path,method),false,`${method} ${path}`);
});

test('authentication middleware enforces Tracker scope after token verification', () => {
  const module = {exports:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/middleware/auth'),'utf8'), {
    module, process:{env:{}}, require(name) {
      if (name==='jsonwebtoken') return {verify(token) { if(token==='invalid') throw Error('invalid'); return {id:8,role:token}; }};
      if (name==='./trackerAccess') return {trackerCanRequest};
      throw Error(name);
    },
  });
  function request(role,path,method='GET') {
    let result='next'; const res={status(code){result=code;return this},json(){return this}};
    module.exports.authenticateToken({headers:role?{authorization:`Bearer ${role}`}:{},query:{},baseUrl:'/api',path,method},res,()=>{});
    return result;
  }
  assert.equal(request('tracker','/shipments/tracking'),'next');
  assert.equal(request('tracker','/auth/profile','POST'),'next');
  assert.equal(request('tracker','/auth/admin/users'),403);
  assert.equal(request('tracker','/shipments'),403);
  assert.equal(request('admin','/shipments'),'next');
  assert.equal(request('rater','/shipments/tracking'),403);
  assert.equal(request(null,'/shipments/tracking'),401);
  assert.equal(request('invalid','/shipments/tracking'),403);
});

test('Tracker registration requires administrator credentials and never provisions RFQ sandbox tables', async () => {
  let inserts=0; const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/controllers/authController'),'utf8'), {
    module, console, process:{env:{}}, Buffer, require(name) {
      if(name==='bcryptjs') return {compare:async (p)=>p==='Admin123',genSalt:async()=> 'salt',hash:async()=> 'hash'};
      if(name==='jsonwebtoken'||name==='nodemailer'||name==='../utils/mailer'||name==='../utils/crypto') return {};
      if(name==='crypto')return {generateKeyPairSync:()=>({publicKey:'test',privateKey:'test'})};
      if(name==='../config/db')return {query:async(sql,values)=>{
        if(sql.startsWith('SELECT password_hash'))return {rows:[{password_hash:'hash',role:'admin'}]};
        if(sql.startsWith('SELECT id'))return {rows:[]};
        if(sql.startsWith('INSERT INTO users')) {inserts++;return {rows:[{id:8,username:values[0],role:values[2]}]};}
        throw Error('Unexpected SQL: '+sql);
      }};
      throw Error('Unexpected dependency: '+name);
    },
  });
  async function register(extra={}) {
    const res={code:200,status(c){this.code=c;return this},json(data){this.data=data;return this}};
    await module.exports.register({body:{newUsername:'tracker8',newPassword:'Tracker123',role:' Tracker ',email_address:'tracker@example.test',...extra}},res,e=>{throw e});
    return res;
  }
  assert.equal((await register()).code,400);
  assert.equal((await register({adminUsername:'admin',adminPassword:'wrong'})).code,401);
  assert.equal(inserts,0);
  const result=await register({adminUsername:'admin',adminPassword:'Admin123'});
  assert.equal(result.code,201);
  assert.equal(result.data.user.role,'tracker');
  assert.equal(inserts,1);
});

test('deployed Tracker navigation exposes Operations and Account Settings and redirects other pages', () => {
  const path=require('node:path');
  const out=path.resolve(__dirname,'../../frontend/out');
  const html=fs.readFileSync(path.join(out,'settings.html'),'utf8');
  const asset=html.match(/src="([^" ]*6752-[^"]+)"/)[1];
  const modules={};
  const user={id:8,username:'tracker8',role:'tracker'};
  let pathname='/shipment-tracking',effects=[],redirects=[],calls=[],hook=0;
  const jsx=(type,props)=>({type,props});
  const hooks={useState:init=>[hook++===0?user:init,()=>{}],useEffect:fn=>effects.push(fn),useRef:value=>({current:value})};
  const storage={getItem:()=>null,setItem:()=>{}};
  vm.runInNewContext(fs.readFileSync(path.join(out,asset),'utf8'),{
    self:{webpackChunk_N_E:{push(value){Object.assign(modules,value[1])}}},
    window:{addEventListener(){},removeEventListener(){}},localStorage:storage,sessionStorage:storage,
    document:{documentElement:{classList:{contains:()=>false,add(){},remove(){}}}},
    setInterval(){return 1},clearInterval(){},console,
  });
  const dep=id=>({7437:{jsx,jsxs:jsx},2265:hooks,9376:{useRouter:()=>({replace:p=>redirects.push(p)}),usePathname:()=>pathname},6023:{B:{getUser:()=>user,isAuthenticated:()=>true}},6362:{a:()=>({user,logout(){}})},9116:{Z:{get:async p=>{calls.push(p);return {data:{}}}}}}[id]||{Z:'Icon',default:'Link'});
  dep.d=(exports,definitions)=>{for(const [key,value]of Object.entries(definitions))Object.defineProperty(exports,key,{get:value});};
  dep.n=value=>()=>value.default||value;
  const exports={};modules[6752]({},exports,dep);
  function flatten(node,result=[]){if(!node||typeof node!=='object')return result;if(node.type)result.push(node);if(Array.isArray(node))node.forEach(n=>flatten(n,result));else if(node.props)flatten(node.props.children,result);return result;}
  const tree=exports.Z({children:'Test'});
  const hrefs=flatten(tree).filter(n=>n.props.href).map(n=>n.props.href);
  assert.deepEqual([...new Set(hrefs)].sort(),['/settings','/shipment-tracking']);
  // The nested Sidebar renders its own filtered desktop menu.
  const sidebar=flatten(tree).find(n=>typeof n.type==='function');
  assert.ok(sidebar);
  hook=0;effects=[];
  const sideTree=sidebar.type({});
  const sideLinks=flatten(sideTree).filter(n=>n.props.href&&n.props.href!=='/').map(n=>n.props.href);
  assert.deepEqual([...new Set(sideLinks)].sort(),['/settings','/shipment-tracking']);
  effects.forEach(fn=>fn());
  assert.deepEqual(calls,[],'No requests for RFQ unread counts');
  pathname='/admin/register';hook=0;effects=[];
  assert.equal(exports.Z({children:'Forbidden page'}),null);
  effects.forEach(fn=>fn());
  assert.ok(redirects.includes('/shipment-tracking'));
});
