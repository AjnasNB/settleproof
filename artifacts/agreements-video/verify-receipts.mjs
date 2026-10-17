import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const files=['early-receipt.json','downloaded-receipt.json','pre-approval-receipt.json','approved-receipt.json','final-receipt.json','tampered-copy.json'];
const receipts={},checks=[];
for(const file of files){
 const bytes=await fs.readFile(path.join(root,file));const receipt=JSON.parse(bytes);receipts[file]=receipt;
 let bad=null,previous=null;
 for(let i=0;i<receipt.events.length;i++){
  const {hash:claimed,...unsigned}=receipt.events[i];
  if(receipt.events[i].sequence!==i+1||(i>0&&receipt.events[i].previousHash!==previous)||hash(JSON.stringify(canonical(unsigned)))!==claimed){bad=i+1;break;}
  previous=claimed;
 }
 const anchorMatches=bad===null&&receipt.anchor.sequence===receipt.events.length&&receipt.anchor.hash===previous;
 checks.push({file,bytes:bytes.length,sha256:hash(bytes),events:receipt.events.length,chainValid:bad===null&&anchorMatches,firstInvalidEvent:bad,anchorMatches});
}
const early=receipts['early-receipt.json'],final=receipts['final-receipt.json'];
const prefixMatches=early.events.every((event,i)=>JSON.stringify(canonical(event))===JSON.stringify(canonical(final.events[i])));
const report={checks,retainedPrefix:{sequence:early.anchor.sequence,hash:early.anchor.hash,exactEventsMatch:prefixMatches,finalEventMatches:final.events[early.anchor.sequence-1].hash===early.anchor.hash},scope:'Independent local file/hash readback only. Provider browser actions owned by root. UI positive and altered-copy negative verdicts separately inspected in frozen screenshots. No browser-download event confirmation claimed.',limitations:'Integrity and retained-prefix consistency do not establish identity, signatures, truth, latest completeness, immutable storage or irreversible settlement.'};
await fs.writeFile(path.join(root,'RECEIPT-VERIFICATION.json'),JSON.stringify(report,null,2)+'\n');
if(checks.slice(0,-1).some(c=>!c.chainValid)||checks.at(-1).firstInvalidEvent!==1||!prefixMatches)throw new Error('Receipt verification expectation failed');
console.log(JSON.stringify({genuineFilesValid:checks.slice(0,-1).length,tamperedFirstInvalidEvent:checks.at(-1).firstInvalidEvent,retainedPrefixMatches:prefixMatches}));
