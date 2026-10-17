import {readFileSync,writeFileSync} from 'node:fs';
for(const name of ['01-check','02-source','03-ai','04-review']){
  const file=new URL(`./compositions/frames/${name}.html`,import.meta.url);
  let s=readFileSync(file,'utf8');
  s=s.replace(new RegExp(`(?<!sp)${name}-`,'g'),`sp${name}-`);
  // Valid ordinary ID selectors remove numeric-ID escaping ambiguity.
  s=s.replace(/\[id="(sp\d\d-[^"]+)"\]/g,'#$1');
  if(name==='01-check')s=s.replace(/<(div|section) (class="clip sp01-check-(ground|scene)"[^>]*data-start="([^"]+)"[^>]*)>/g,(_,tag,attrs,kind,start)=>`<${tag} id="sp01-check-${kind==='ground'?'ground':`scene-${start}`}" ${attrs}>`);
  if(name==='03-ai'){
    s=s.replace('<div class="clip sp03-ai-ground"','<div id="sp03-ai-ground" class="clip sp03-ai-ground"');
    // Framework clip timing owns these cuts; do not hide a timed clip at zero.
    s=s.replace(/^\s+tl\.set\('#sp03-ai-(pending|response)'[^\n]+\n/gm,'\n');
  }
  writeFileSync(file,s);
}
