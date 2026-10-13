/* Original radix-2 FFT and overlap-add STFT. Shared by browser worker and tests. */
(function(root){
'use strict';
const N=1024,H=256,FS=16000;
const window=Float64Array.from({length:N},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/N));
function fft(re,im,inverse=false){
  const n=re.length;
  for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}
  for(let size=2;size<=n;size*=2){const angle=(inverse?2:-2)*Math.PI/size,wr0=Math.cos(angle),wi0=Math.sin(angle);for(let start=0;start<n;start+=size){let wr=1,wi=0;for(let k=0;k<size/2;k++){const i=start+k,j=i+size/2,tr=wr*re[j]-wi*im[j],ti=wr*im[j]+wi*re[j];re[j]=re[i]-tr;im[j]=im[i]-ti;re[i]+=tr;im[i]+=ti;const next=wr*wr0-wi*wi0;wi=wr*wi0+wi*wr0;wr=next}}}
  if(inverse)for(let i=0;i<n;i++){re[i]/=n;im[i]/=n}
}
function validate(x){if(x.length<1600||x.length>FS*60)throw new Error('Audio must be 0.1–60 seconds');for(const v of x)if(!Number.isFinite(v))throw new Error('Audio contains non-finite samples')}
function frame(x,center){const re=new Float64Array(N),im=new Float64Array(N);for(let i=0;i<N;i++){const j=center+i-N/2;re[i]=(j>=0&&j<x.length?x[j]:0)*window[i]}fft(re,im);return {re,im}}
function stats(x){let sum=0,peak=0,clipped=0;for(const v of x){sum+=v*v;peak=Math.max(peak,Math.abs(v));if(Math.abs(v)>=1)clipped++}return {rms:Math.sqrt(sum/x.length),peak,clipped_samples:clipped,samples:x.length}}
function validateEdits(x,edits){if(!Array.isArray(edits)||edits.length>50)throw new Error('Maximum 50 edits');for(const e of edits){if(!['attenuate','isolate'].includes(e.operation)||![e.start_s,e.end_s,e.min_hz,e.max_hz,e.gain_db].every(Number.isFinite)||e.start_s<0||e.start_s>=e.end_s||e.end_s>x.length/FS+1/FS||e.min_hz<0||e.max_hz>8000||e.min_hz>=e.max_hz||e.gain_db>0||e.gain_db< -80)throw new Error('Invalid selection. Check time, frequency and gain bounds.')}}
function render(x,edits){
 validate(x);validateEdits(x,edits);const out=new Float64Array(x.length+N*2),norm=new Float64Array(out.length),count=Math.ceil(x.length/H)+1;
 for(let ti=0;ti<count;ti++){const center=ti*H,{re,im}=frame(x,center);
  for(const e of edits)for(let k=0;k<=N/2;k++){let mask=0;for(let dt=-1;dt<=1;dt++)for(let df=-1;df<=1;df++){const t=Math.max(0,Math.min(count-1,ti+dt))*H/FS,f=Math.max(0,Math.min(N/2,k+df))*FS/N;if(t>=e.start_s&&t<=e.end_s&&f>=e.min_hz&&f<=e.max_hz)mask+=1/9}const gain=e.operation==='isolate'?mask:1-mask*(1-Math.pow(10,e.gain_db/20));re[k]*=gain;im[k]*=gain;if(k>0&&k<N/2){re[N-k]*=gain;im[N-k]*=gain}}
  fft(re,im,true);for(let i=0;i<N;i++){const j=center+i;out[j]+=re[i]*window[i];norm[j]+=window[i]*window[i]}
 }const result=new Float32Array(x.length);for(let i=0;i<x.length;i++)result[i]=out[i+N/2]/Math.max(1e-12,norm[i+N/2]);return result;
}
function view(x,start,end){validate(x);end=Math.min(end,x.length/FS);if(!(start>=0&&start<end))throw new Error('Empty time range');const first=Math.ceil(start*FS/H),last=Math.floor(end*FS/H),stride=Math.max(1,Math.ceil((last-first+1)/800)),times=[],db=Array.from({length:N/2+1},()=>[]);for(let ti=first;ti<=last;ti+=stride){const {re,im}=frame(x,ti*H);times.push(ti*H/FS);for(let k=0;k<=N/2;k++)db[k].push(Math.max(-120,Math.min(0,20*Math.log10(Math.max(1e-6,Math.hypot(re[k],im[k])/(N/2))))))}const begin=Math.floor(start*FS),stop=Math.floor(end*FS),bins=Math.min(800,stop-begin),waveform=[];for(let i=0;i<bins;i++){let lo=Infinity,hi=-Infinity;for(let j=begin+Math.floor(i*(stop-begin)/bins);j<begin+Math.floor((i+1)*(stop-begin)/bins);j++){lo=Math.min(lo,x[j]);hi=Math.max(hi,x[j])}waveform.push([lo,hi])}return {...stats(x),start_s:start,end_s:end,frequencies_hz:Array.from({length:N/2+1},(_,i)=>i*FS/N),times_s:times,db,waveform}}
function wav(x){const data=new ArrayBuffer(44+x.length*4),v=new DataView(data);function text(i,s){for(let j=0;j<s.length;j++)v.setUint8(i+j,s.charCodeAt(j))}text(0,'RIFF');v.setUint32(4,data.byteLength-8,true);text(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,3,true);v.setUint16(22,1,true);v.setUint32(24,FS,true);v.setUint32(28,FS*4,true);v.setUint16(32,4,true);v.setUint16(34,32,true);text(36,'data');v.setUint32(40,x.length*4,true);for(let i=0;i<x.length;i++)v.setFloat32(44+i*4,x[i],true);return data}
root.TrishulDSP={fft,render,view,stats,wav};if(typeof module!=='undefined')module.exports=root.TrishulDSP;
})(typeof self!=='undefined'?self:globalThis);
