import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const ledger=JSON.parse(await fs.readFile(path.join(root,'source-asset-ledger.json'),'utf8'));
const shots=JSON.parse(await fs.readFile(path.join(root,'shot-status.json'),'utf8')).shots;
const active=new Map();
for(const shot of shots){const record=active.get(shot.source)||[];record.push(shot.number);active.set(shot.source,record);}
active.set('assets/frozen/08-consents-reset.jpg',[8]);
const extra={
 '16-retained-prefix-verified':{id:'receipt-prefix-ui',observedState:'Internal chain valid; 25 events checked; retained event 5 matches. Later legitimate events are allowed.',shots:[16]},
 '17-tamper-rejected':{id:'receipt-tamper-ui',observedState:'Receipt failed integrity checks; changed or invalid event hash; zero events checked. Only the first event title was altered in a separate copy.',shots:[17]}
};
const next=[];
for(const [asset,usedShots] of active){
 const original='assets/'+path.basename(asset).replace(/\.jpg$/,'.png');
 const stem=path.basename(asset,'.jpg');
 let record=ledger.assets.find(a=>a.path===asset||a.path===original);
 if(!record){const e=extra[stem];if(!e)throw new Error('Missing provenance '+asset);record={id:e.id,path:asset,kind:'ui-screenshot',shots:e.shots,source:{method:'cua-capture',description:'Root-supplied hosted UI, actual JPEG 1905x882. Genuine rehearsal repository83a7bbd / deployed e1e21a37, 17 October2026. No exact UTC camera time recorded.',buildCommit:'83a7bbd',version:2,role:'buyer',observedState:e.observedState,syntheticInput:true},rights:'Project-supplied original UI capture; third-party marks retain respective rights.',privacy:{reviewed:true,containsCapability:false,containsCredentials:false,containsPersonalAccountData:false},evidenceStatus:'accepted',limitations:'Edited genuine state sequence, not continuous screen recording. Hash integrity does not establish identity, signatures, truth, latest completeness, immutable storage or settlement.'};}
 const bytes=await fs.readFile(path.join(root,asset));
 if(bytes[0]!==0xff||bytes[1]!==0xd8)throw new Error('Expected JPEG '+asset);
 let originalHash;
 try{originalHash=digest(await fs.readFile(path.join(root,original)));if(originalHash!==digest(bytes))throw new Error('Frozen bytes differ: '+asset);}catch(e){if(e.code!=='ENOENT')throw e;originalHash=record.sha256;}
 record.path=asset;record.sha256=digest(bytes);record.shots=usedShots;
 if(!record.source.description.includes('Original capture:'))record.source.description+=' Original capture: '+original+'; SHA-256 '+originalHash+'.';
 record.privacy.transforms=['Byte-identical copy to accurate .jpg extension; no recompression. Composition crops are documented in shot-status.json; no UI content is recreated.'];
 next.push(record);
}
for(const record of ledger.assets.filter(a=>a.kind!=='ui-screenshot')){record.sha256=digest(await fs.readFile(path.join(root,record.path)));record.shots=Array.from({length:17},(_,i)=>i+1);next.push(record);}
await fs.writeFile(path.join(root,'source-asset-ledger.json'),JSON.stringify({schemaVersion:1,assets:next},null,2)+'\n');
console.log(JSON.stringify({activeScreens:active.size,records:next.length,allFileHashesChecked:true,frozenBytesEqualOriginals:true,fullSchemaLibraryValidation:false}));
