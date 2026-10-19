// Compare existing public SEO against the pre-change Git revision.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const base=process.argv[2]||'HEAD';
const paths=execFileSync('git',['ls-tree','-r','--name-only',base,'dist'],{encoding:'utf8'}).trim().split('\n').filter(p=>p.endsWith('.html'));
for(const file of paths){
 const before=execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8',maxBuffer:3000000});
 const after=fs.readFileSync(file,'utf8');
 for(const pattern of [/<title>[^<]*<\/title>/g,/<h1\b[^>]*>[\s\S]*?<\/h1>/g,/<meta[^>]+name="(?:description|keywords)"[^>]*>/g,/<link[^>]+rel="canonical"[^>]*>/g]){
   if(JSON.stringify(before.match(pattern))!==JSON.stringify(after.match(pattern)))throw Error(`${file}: existing SEO changed (${pattern})`);
 }
}
console.log(`SEO invariants preserved across ${paths.length} public pages.`);
