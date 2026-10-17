import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Reproducible composition source. Media remains frozen and unchanged.
const project = path.dirname(fileURLToPath(import.meta.url));
const verifiedEnd = 140;
const entries = [
  [1,0,6,'Good work starts with a clear agreement.','01-landing.png',[320,105,1260,430],'An invented service engagement · Sandbox demonstration'],
  [2,6,7,'Two milestones. Test funds. Clear expectations.','05-human-edited-terms.png',[390,1130,810,260],'Observed editor amounts: USD12.00 + USD8.00 = USD20.00'],
  [3,13,8,'Start with the brief. Keep the amounts fixed.','03-ai-brief.png',[390,990,810,300],'Invented brief · AI may propose criteria, never acceptance or payment'],
  [4,21,8,'AI proposes. People decide.','04-ai-proposal.png',[390,1330,810,400],'Generated proposal · Two milestones · Three questions · Human review required'],
  [5,29,8,'Review every criterion before agreeing.','05-human-edited-terms.png',[390,1130,810,260],'Human-edited criteria name the sections and desktop/mobile handoff'],
  [6,37,8,'Separate access roles. No identity claim.','06-seller-version-one.png',[360,565,1200,600],'Version1 · Seller view · Neither role has accepted'],
  [7,45,8,'Either person can propose better terms.','07-buyer-counteroffer.png',[390,1480,810,300],'Buyer counteroffer adds a clearly labelled Contact call to action'],
  [8,53,8,'Same terms. Same version. Two decisions.','08-both-accepted.png',[360,640,1200,480],'Version2 · Both roles accepted · One operator demonstrates separate roles'],
  [9,61,9,'A handoff is a claim to review.','09-seller-handoff.png',[385,20,820,355],'Delivered assertion deliberately omits the agreed Contact call to action'],
  [10,70,7,'Request changes before accepting the work.','10-changes-requested.png',[385,115,820,215],'Buyer requests the missing item; revised seller handoff is required'],
  [11,77,9,'Acceptance stays a human decision.','11-handoff-accepted.png',[385,60,820,425],'Revised handoff accepted · Nine human-workflow events · No payment proof'],
  [12,86,8,'An order is created. Payment is still unpaid.','12-order-unpaid.png',[385,395,820,295],'Observed PAYER_ACTION_REQUIRED · USD0.00 captured · USD12.00 remaining'],
  [13,94,10,'PayPal approval is not a captured payment.','13-approved-not-captured.png',[385,445,820,280],'Stored-link approval · Fresh server read APPROVED · USD0.00 captured'],
  [14,104,9,'Capture requires a separate human action.','13-approved-not-captured.png',[385,235,820,190],'Actual capture control before the human action · Result shown next'],
  [15,113,9,'Fresh provider facts complete the payment receipt.','15-capture-verified.png',[385,450,820,280],'Observed COMPLETED · USD12.00 captured · USD0.00 remaining · Second USD8.00 pending'],
  [16,122,9,'A saved checkpoint still matches after later events.','16-retained-prefix-verified.png',[355,515,870,310],'25 events checked · Earlier checkpoint at event 5 still matches'],
  [17,131,9,'Changes become detectable against your saved record.','17-tamper-rejected.png',[355,615,870,246],'Inspectable history · No escrow, identity verification or settlement guarantee']
];
const pending = [];
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
await fs.mkdir(path.join(project,'compositions','frames'),{recursive:true});
await fs.mkdir(path.join(project,'assets','frozen'),{recursive:true});
for(const original of new Set([...entries.map(e=>e[4]),'08-consents-reset.png'])){
  const frozen=path.join(project,'assets','frozen',original.replace(/\.png$/i,'.jpg'));
  try{await fs.copyFile(path.join(project,'assets',original),frozen);}catch(error){if(error.code!=='ENOENT')throw error;await fs.access(frozen);}
}
const shots=[];
for(const [number,start,duration,title,asset,crop,note] of entries){
  const id=`ag${String(number).padStart(2,'0')}`;
  const src=`compositions/frames/${String(number).padStart(2,'0')}-scene.html`;
  const [x,y,w,h]=crop;
  // Do not magnify low-resolution evidence to fill the canvas.
  const scale=Math.min(1.35,1688/w,560/h);
  const offsetX=(1728-w*scale)/2, offsetY=(600-h*scale)/2;
  const frozenAsset=`assets/frozen/${asset.replace(/\.png$/i,'.jpg')}`;
  const reset = number===8 ? `<div id="ag08-reset" class="evidence-crop" style="width:1120px;height:560px;left:304px;top:20px"><img class="evidence-image" data-layout-ignore="true" src="assets/frozen/08-consents-reset.jpg" alt="Version two with both consents reset" style="left:-336px;top:-597px;width:1778px"/></div>` : '';
  const detail = number===2||number===5 ? `<div id="${id}-detail2" class="evidence-crop" style="width:1094px;height:392px;left:317px;top:104px"><img id="${id}-detail-image" class="evidence-image" data-layout-ignore="true" data-start="${duration/2}" data-duration="${duration/2}" data-track-index="5" src="assets/frozen/05-human-edited-terms.jpg" alt="Actual second milestone amount and acceptance criteria" style="left:-527px;top:-2012px;width:2572px"/></div>` : '';
  const endcard=number===17?`<div id="ag17-endcard"><p class="end-label">SETTLEPROOF AGREEMENTS</p><h2>Agree. Review. Pay.<br/>Keep the receipt.</h2><p class="end-url">settleproof.ajnasnb.com</p><p class="end-source">MIT source · github.com/AjnasNB/settleproof</p></div>`:'';
  const file=`<template>
<style>#${id}-root{position:absolute;inset:0;width:100%;height:100%;box-sizing:border-box}#${id}-crop{width:${Math.round(w*scale)}px;height:${Math.round(h*scale)}px;left:${Math.round(offsetX)}px;top:${Math.round(offsetY)}px}#${id}-image{left:${-Math.round(x*scale)}px;top:${-Math.round(y*scale)}px;width:${Math.round((number===9?1920:1905)*scale)}px}</style>
<section id="${id}-root" data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="${duration}">
 <div id="${id}-ground" class="clip frame-ground" data-start="0" data-duration="${duration}" data-track-index="0"></div>
 <div id="${id}-content" class="clip frame-content" data-start="0" data-duration="${duration}" data-track-index="1">
  <header id="${id}-heading" class="frame-heading"><p class="frame-index">SETTLEPROOF AGREEMENTS <span>${String(number).padStart(2,'0')} / 17</span></p><h1>${escape(title)}</h1></header>
  <figure id="${id}-evidence" class="evidence-viewport"><div id="${id}-crop" class="evidence-crop"><img id="${id}-image" class="evidence-image" data-layout-ignore="true" ${number===2||number===5?`data-start="0" data-duration="${duration/2}" data-track-index="4"`:''} src="${escape(frozenAsset)}" alt="Actual source capture for shot ${number}" /></div>${reset}${detail}</figure>
  ${endcard}
 </div>
</section>
<script>const ${id}Timeline=gsap.timeline({paused:true});${id}Timeline.fromTo('#${id}-heading',{opacity:0,y:16},{opacity:1,y:0,duration:.48,ease:'power3.out'},0);${id}Timeline.fromTo('#${id}-evidence',{opacity:0},{opacity:1,duration:.38,ease:'power2.out'},.18);${number===2||number===5?`${id}Timeline.set('#${id}-detail2',{opacity:0},0).set('#${id}-crop',{opacity:1},0).set('#${id}-crop',{opacity:0},${duration/2}).set('#${id}-detail2',{opacity:1},${duration/2});`:''}${number===8?"ag08Timeline.set('#ag08-crop',{opacity:0},0).set('#ag08-reset',{opacity:1},0).set('#ag08-reset',{opacity:0},4).set('#ag08-crop',{opacity:1},4);":''}${number===17?"ag17Timeline.set('#ag17-endcard',{opacity:0},0).set('#ag17-heading',{opacity:0},5).set('#ag17-evidence',{opacity:0},5).set('#ag17-endcard',{opacity:1},5);":''}window.__timelines['${id}']=${id}Timeline;</script>
</template>
`;
  await fs.writeFile(path.join(project,src),file.replace(/[ \t]+$/gm,''));
  shots.push({number,start,duration,title,note,source:frozenAsset,originalCapture:'assets/'+asset,crop,src,status:'authored-awaiting-frame-review',providerProof:number>=12&&number<=16});
}
const hosts=shots.map(s=>` <div id="slot-${s.number}" class="clip" data-composition-id="ag${String(s.number).padStart(2,'0')}" data-composition-src="${s.src}" data-start="${s.start}" data-duration="${s.duration}" data-track-index="1" data-width="1920" data-height="1080"></div>`).join('\n');
const captions=shots.map(s=>{const delay=s.number===8?4.2:s.duration*.42;return ` <p id="caption-${s.number}" class="clip manual-caption" data-layout-allow-caption-zone="true" data-start="${Number((s.start+delay).toFixed(2))}" data-duration="${Number((s.duration-delay).toFixed(2))}" data-track-index="${3+Math.floor((s.number-1)/3)}">${escape(s.note)}</p>`;}).join('\n');
await fs.writeFile(path.join(project,'index.html'),`<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=1920,height=1080"/><title>SettleProof Agreements — sandbox demonstration</title>
<script src="assets/vendor/gsap.min.js"></script>
<style>
@font-face{font-family:Geist;src:url('assets/fonts/Geist-Variable.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:block}
*{box-sizing:border-box}body{margin:0;background:#f5f6f0;color:#193b35;font-family:Geist,sans-serif}#root{position:relative;width:100%;height:100%;overflow:hidden}.frame-ground{position:absolute;inset:0;background:#f5f6f0}.frame-content{position:absolute;inset:0}.frame-heading{position:absolute;left:96px;top:54px;width:1728px}.frame-index{font-size:24px;line-height:1.3;margin:0 0 22px;letter-spacing:.07em;font-weight:500}.frame-index span{float:right;color:#5b6c65}h1{font-size:64px;line-height:1.1;font-weight:550;letter-spacing:-.03em;margin:0;max-width:1728px}.evidence-viewport{position:absolute;left:96px;top:290px;width:1728px;height:600px;margin:0;border:2px solid #dce4db;border-radius:12px;background:#fbfcf7;overflow:hidden}.evidence-crop{position:absolute;overflow:hidden}.evidence-image{position:absolute;max-width:none;height:auto}.manual-caption{position:absolute;left:96px;top:924px;width:1728px;height:86px;font-size:32px;line-height:1.35;margin:0;color:#245e49}.assembly-status{position:absolute;inset:auto 0 0;height:38px;background:#edf2e5;color:#193b35;display:flex;align-items:center;justify-content:center;font-size:24px;z-index:50}#ag17-endcard{position:absolute;left:0;top:0;width:100%;height:900px;padding:96px;background:#f5f6f0;display:flex;flex-direction:column;justify-content:center}#ag17-endcard .end-label{font-size:24px;letter-spacing:.08em;margin:0 0 28px}#ag17-endcard h2{font-size:84px;line-height:1.1;letter-spacing:-.035em;font-weight:550;margin:0}#ag17-endcard .end-url{font-size:40px;color:#245e49;margin:36px 0 0}#ag17-endcard .end-source{font-size:28px;color:#5b6c65;margin:18px 0 0}
</style></head><body>
<main id="root" data-composition-id="agreements-film" data-width="1920" data-height="1080" data-duration="${verifiedEnd}">
${hosts}
${captions}
 <aside id="assembly-status" class="clip assembly-status" data-layout-allow-caption-zone="true" data-start="0" data-duration="${verifiedEnd}" data-track-index="2">One operator demonstrates separate roles · PayPal Sandbox test funds · No escrow or settlement guarantee</aside>
</main>
<script>const filmTimeline=gsap.timeline({paused:true});window.__timelines['agreements-film']=filmTimeline;</script>
</body></html>
`);
await fs.writeFile(path.join(project,'shot-status.json'),JSON.stringify({plannedDuration:140,scaffoldDuration:verifiedEnd,final:false,rendered:false,shots:[...shots,...pending.map(s=>({...s,status:'awaiting-genuine-evidence',src:null,providerProof:false}))]},null,2)+'\n');
const board=['---','format: 1920x1080','duration: 140s','mode: autonomous','music: none','message: "Agree, review, connect payment evidence, retain the receipt"','status: authored-awaiting-final-reviews','---','','# Agreements production storyboard','','All17source-backed shots are mounted for140seconds. Real provider and final receipt proofs are present; film QA/Studio/render remain pending.','','## Video direction','','Use frame.md ivory/green and Geist. Calm title arrival, genuine UI reveal, sharp later captions, then held evidence for reading. No fake cursor/click/state. Shot8 shows actual reset before actual dual consent; shot17 holds real tamper failure5seconds then the source/live endcard4seconds. Approval used the stored sandbox link and a fresh server read, not a proved v6 onApprove callback. Captions are root-owned in the bottom band; product evidence remains above900px. Silent: no narration/music/SFX.',''];
for(const shot of shots){board.push(`## Frame ${shot.number} — ${shot.title}`,'',`- scene: ${shot.title}`,`- duration: ${shot.duration}s`,'- transition_in: cut','- status: animated',`- src: ${shot.src}`,`- asset_candidates: ${shot.source}`,'- blueprint: compose','- layout_review: pending','',`Scene1 (0–0.6s): Calm title arrival and genuine source-crop reveal. Scene2 (42%–100%): Sharp root caption quotes the observed facts while source holds for reading.${shot.number===8?' Actual consent-reset source is replaced by the real accepted-version source at4s.':''}${shot.number===17?' Real failure holds until5s; endcard then holds through9s.':''}`,'');}
for(const shot of pending){board.push(`## Frame ${shot.number} — ${shot.claim}`,'',`- scene: ${shot.claim}`,`- duration: ${shot.duration}s`,'- status: outline','- evidence: pending genuine provider proof','', 'No composition source or provider visual exists for this slot. Do not mount or render a placeholder as proof.','');}
await fs.writeFile(path.join(project,'STORYBOARD.md'),board.join('\n'));
console.log('Authored17genuine source-backed shots /140seconds. Composition awaits frame reviews, Studio and local encode.');
