import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Working assembly only. Do not rerun after production frame workers replace it.
const project = path.dirname(fileURLToPath(import.meta.url));
const verifiedEnd = 94;
const entries = [
  [1,0,6,'Good work starts with a clear agreement.','01-landing.png',[320,105,1260,430],'An invented service engagement · Sandbox demonstration'],
  [2,6,7,'Two milestones. Test funds. Clear expectations.','05-human-edited-terms.png',[390,1100,820,820],'Observed editor amounts: USD12.00 + USD8.00 = USD20.00'],
  [3,13,8,'Start with the brief. Keep the amounts fixed.','03-ai-brief.png',[390,990,810,300],'Invented brief · AI may propose criteria, never acceptance or payment'],
  [4,21,8,'AI proposes. People decide.','04-ai-proposal.png',[390,1330,810,400],'Generated proposal · Two milestones · Three questions · Human review required'],
  [5,29,8,'Review every criterion before agreeing.','05-human-edited-terms.png',[390,1120,810,710],'Human-edited criteria name the sections and desktop/mobile handoff'],
  [6,37,8,'Separate access roles. No identity claim.','06-seller-version-one.png',[360,565,1200,600],'Version1 · Seller view · Neither role has accepted'],
  [7,45,8,'Either person can propose better terms.','07-buyer-counteroffer.png',[390,1480,810,300],'Buyer counteroffer adds a clearly labelled Contact call to action'],
  [8,53,8,'Same terms. Same version. Two decisions.','08-both-accepted.png',[360,640,1200,480],'Version2 · Both roles accepted · One operator demonstrates separate roles'],
  [9,61,9,'A handoff is a claim to review.','09-seller-handoff.png',[385,20,820,355],'Delivered assertion deliberately omits the agreed Contact call to action'],
  [10,70,7,'Request changes before accepting the work.','10-changes-requested.png',[385,115,820,215],'Buyer requests the missing item; revised seller handoff is required'],
  [11,77,9,'Acceptance stays a human decision.','11-handoff-accepted.png',[385,60,820,425],'Revised handoff accepted · Nine human-workflow events · No payment proof'],
  [12,86,8,'SDK ready. Payment proof pending.','12-sdk-ready.png',[385,320,820,255],'Actual readiness control · No confirmed order, approval or capture yet']
];
const pending = [
  {number:13,start:94,duration:10,claim:'Genuine approval before capture'},
  {number:14,start:104,duration:9,claim:'Explicit human capture'},
  {number:15,start:113,duration:9,claim:'Fresh matching provider evidence'},
  {number:16,start:122,duration:9,claim:'Final export and retained-prefix verification'},
  {number:17,start:131,duration:9,claim:'Real altered-copy failure and final end card'}
];
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
await fs.mkdir(path.join(project,'compositions','frames'),{recursive:true});
const shots=[];
for(const [number,start,duration,title,asset,crop,note] of entries){
  const id=`ag${String(number).padStart(2,'0')}`;
  const src=`compositions/frames/${String(number).padStart(2,'0')}-scaffold.html`;
  const [x,y,w,h]=crop;
  // Do not magnify low-resolution evidence to fill the canvas.
  const scale=Math.min(1.15,1688/w,666/h);
  const offsetX=(1728-w*scale)/2, offsetY=(704-h*scale)/2;
  const file=`<!doctype html>
<html lang="en"><body><template>
<style>#${id}-root{position:absolute;inset:0;width:100%;height:100%;box-sizing:border-box}#${id}-crop{width:${Math.round(w*scale)}px;height:${Math.round(h*scale)}px;left:${Math.round(offsetX)}px;top:${Math.round(offsetY)}px}#${id}-image{left:${-Math.round(x*scale)}px;top:${-Math.round(y*scale)}px;width:calc(var(--source-width) * ${scale}px)}</style>
<section id="${id}-root" data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="${duration}">
 <div id="${id}-ground" class="clip frame-ground" data-start="0" data-duration="${duration}" data-track-index="0"></div>
 <div id="${id}-content" class="clip frame-content" data-start="0" data-duration="${duration}" data-track-index="1">
  <header class="frame-heading"><p class="frame-index">SETTLEPROOF AGREEMENTS <span>${String(number).padStart(2,'0')} / 17 PLANNED</span></p><h1>${escape(title)}</h1></header>
  <figure class="evidence-viewport"><div id="${id}-crop" class="evidence-crop"><img id="${id}-image" class="evidence-image" src="../../assets/${escape(asset)}" alt="Actual source capture for shot ${number}" style="--source-width:${number===9?1920:1905}" /></div></figure>
  <p class="evidence-note">${escape(note)}</p>
 </div>
</section>
<script>const ${id}Timeline=gsap.timeline({paused:true});window.__timelines['${id}']=${id}Timeline;</script>
</template></body></html>
`;
  await fs.writeFile(path.join(project,src),file);
  shots.push({number,start,duration,title,source:'assets/'+asset,crop,src,status:'scaffolded-not-frame-reviewed',providerProof:false});
}
const hosts=shots.map(s=>` <div id="slot-${s.number}" class="clip" data-composition-id="ag${String(s.number).padStart(2,'0')}" data-composition-src="${s.src}" data-start="${s.start}" data-duration="${s.duration}" data-track-index="1" data-width="1920" data-height="1080"></div>`).join('\n');
await fs.writeFile(path.join(project,'index.html'),`<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=1920,height=1080"/><title>Agreements working assembly — provider proof pending</title>
<script src="assets/vendor/gsap.min.js"></script>
<style>
@font-face{font-family:Geist;src:url('assets/fonts/Geist-Variable.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:block}
*{box-sizing:border-box}body{margin:0;background:#f5f6f0;color:#193b35;font-family:Geist,sans-serif}#root{position:relative;width:100%;height:100%;overflow:hidden}.frame-ground{position:absolute;inset:0;background:#f5f6f0}.frame-content{position:absolute;inset:0}.frame-heading{position:absolute;left:96px;top:54px;width:1728px}.frame-index{font-size:24px;line-height:1.3;margin:0 0 22px;letter-spacing:.07em;font-weight:500}.frame-index span{float:right;color:#5b6c65}h1{font-size:64px;line-height:1.1;font-weight:550;letter-spacing:-.03em;margin:0;max-width:1728px}.evidence-viewport{position:absolute;left:96px;top:246px;width:1728px;height:704px;margin:0;border:2px solid #dce4db;border-radius:12px;background:#fbfcf7;overflow:hidden}.evidence-crop{position:absolute;overflow:hidden}.evidence-image{position:absolute;max-width:none;height:auto}.evidence-note{position:absolute;left:96px;top:960px;width:1728px;font-size:28px;line-height:1.35;margin:0;color:#245e49}.assembly-status{position:absolute;inset:auto 0 0;height:38px;background:#edf2e5;color:#193b35;display:flex;align-items:center;justify-content:center;font-size:20px;letter-spacing:.02em;z-index:50}
</style></head><body>
<main id="root" data-composition-id="agreements-working" data-width="1920" data-height="1080" data-duration="${verifiedEnd}">
${hosts}
 <aside id="assembly-status" class="clip assembly-status" data-start="0" data-duration="${verifiedEnd}" data-track-index="2">WORKING ASSEMBLY · SOURCE CAPTURES ONLY · SHOTS 13–17 AWAIT PROVIDER EVIDENCE · NOT FOR SUBMISSION</aside>
</main>
<script>const workingTimeline=gsap.timeline({paused:true});window.__timelines['agreements-working']=workingTimeline;</script>
</body></html>
`);
await fs.writeFile(path.join(project,'shot-status.json'),JSON.stringify({plannedDuration:140,scaffoldDuration:94,final:false,rendered:false,shots:[...shots,...pending.map(s=>({...s,status:'awaiting-genuine-evidence',src:null,providerProof:false}))]},null,2)+'\n');
const board=['---','format: 1920x1080','duration: 140s','mode: autonomous','music: none','message: "Agree, review, connect payment evidence, retain the receipt"','status: incomplete-scaffold','---','','# Agreements working storyboard','','Derived from ../../docs/VIDEO-AGREEMENTS-STORYBOARD.md. Only0–94s is mounted. No final frame is reviewed or animated; provider13–17 have no source.','','## Video direction','','Use frame.md tokens. These static technical slots establish source placement only. Keep sharp captions outside genuine UI, no fabricated cursor/click/state. Final motion and all seventeen film reviews remain pending. Caption-first silent film; no narration/audio exists.',''];
for(const shot of shots){board.push(`## Frame ${shot.number} — ${shot.title}`,'',`- scene: ${shot.title}`,`- duration: ${shot.duration}s`,'- transition_in: cut','- status: outline',`- src: ${shot.src}`,`- asset_candidates: ${shot.source}`,'- blueprint: compose','- layout_review: pending','',`Scene1 (0–${shot.duration}s): Static source-backed technical scaffold. Actual crop and external caption are present; final readability, timing and motion are unreviewed.`,'');}
for(const shot of pending){board.push(`## Frame ${shot.number} — ${shot.claim}`,'',`- scene: ${shot.claim}`,`- duration: ${shot.duration}s`,'- status: outline','- evidence: pending genuine provider proof','', 'No composition source or provider visual exists for this slot. Do not mount or render a placeholder as proof.','');}
await fs.writeFile(path.join(project,'STORYBOARD.md'),board.join('\n'));
console.log('Scaffolded twelve source-backed slots /94 seconds; shots13–17 have no composition source. No render performed.');
