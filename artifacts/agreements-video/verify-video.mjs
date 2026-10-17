import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const movie=path.join(root,'settleproof-agreements.mp4');
const run=(tool,args)=>new Promise((resolve,reject)=>{
 const child=spawn(tool,args,{windowsHide:true});let stdout='',stderr='';
 child.stdout.on('data',data=>stdout+=data);child.stderr.on('data',data=>stderr+=data);
 child.on('error',reject);child.on('close',code=>code===0?resolve({stdout,stderr}):reject(new Error(tool+' failed: '+stderr)));
});
const probe=JSON.parse((await run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',movie])).stdout);
const video=probe.streams.find(s=>s.codec_type==='video');
const audio=probe.streams.filter(s=>s.codec_type==='audio');
const expected=video?.width===1920&&video?.height===1080&&video?.codec_name==='h264'&&video?.pix_fmt==='yuv420p'&&video?.avg_frame_rate==='24/1'&&Number(video?.nb_read_frames)===3360&&Number(probe.format.duration)===140&&audio.length===0;
if(!expected)throw new Error('Unexpected delivered MP4 metadata: '+JSON.stringify(video));
const decoded=await run('ffmpeg',['-v','error','-i',movie,'-f','null','-']);
if(decoded.stderr.trim())throw new Error('Full decode reported errors: '+decoded.stderr);
const dir=path.join(root,'.hyperframes','decoded');await fs.mkdir(dir,{recursive:true});
const times=[0,3,9.5,17,25,33,41,49,57,65.5,73.5,81.5,90,99,108.5,117.5,126.5,135.5,138,3359/24];
const indices=times.map(t=>Math.min(3359,Math.round(t*24)));
await run('ffmpeg',['-y','-v','error','-i',movie,'-vf',indices.map(n=>'eq(n\\,'+n+')').join('+').replace(/^/,'select='),'-fps_mode','passthrough',path.join(dir,'frame-%02d.png')]);
const bytes=await fs.readFile(movie);
const report={file:'settleproof-agreements.mp4',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),durationSeconds:Number(probe.format.duration),width:video.width,height:video.height,codec:video.codec_name,pixelFormat:video.pix_fmt,frameRate:video.avg_frame_rate,decodedFrames:Number(video.nb_read_frames),audioStreams:audio.length,fullDecode:{exitCode:0,errorOutput:false},decodedSampleFrames:indices.map((frame,i)=>({file:'.hyperframes/decoded/frame-'+String(i+1).padStart(2,'0')+'.png',frame,timeSeconds:frame/24})),visualReview:'Pending inspection of extracted MP4 samples.',studioReview:{url:'http://localhost:3004/#project/agreements-video',durationObserved:'02:20',playbackAdvanced:true,selectedTimesSeconds:[100.326,136.069],limit:'Opening canvas screenshot observed; later Studio screenshots timed out. Live AX confirmed scenes and endcard; full continuous motion playback was not observed.'},publication:'Pending root/user YouTube upload, public playback verification and hackathon entry.'};
await fs.writeFile(path.join(root,'DELIVERY.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({bytes:report.bytes,sha256:report.sha256,duration:report.durationSeconds,resolution:[report.width,report.height],fps:report.frameRate,frames:report.decodedFrames,audio:report.audioStreams,fullDecode:'pass',extractedSamples:indices.length}));
