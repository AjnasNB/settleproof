import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const project=dirname(fileURLToPath(import.meta.url));
const scripts='C:/Users/20cs0/.agents/skills/product-launch-video/scripts';
for(const args of [
  [join(scripts,'assemble-index.mjs'),'--storyboard','./STORYBOARD.md','--hyperframes','.'],
  [join(scripts,'transitions.mjs'),'inject','--storyboard','./STORYBOARD.md','--hyperframes','.'],
  [join(scripts,'transitions.mjs'),'verify','--storyboard','./STORYBOARD.md','--index','./index.html'],
])execFileSync(process.execPath,args,{cwd:project,stdio:'inherit'});
const index=join(project,'index.html');
let html=readFileSync(index,'utf8');
html=html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@3\.14\.2\/dist\/gsap\.min\.js"[^>]*><\/script>/,'<script src="assets/vendor/gsap.min.js"></script>');
html=html.replace('<title>','<title>SettleProof — ');
html=html.replace(/(\sid=")(\d\d-[^"]+)(")/g,'$1sp$2$3');
writeFileSync(index,html);
console.log('Local GSAP3.14.2 frozen; storyboard and frame files remain the source.');
