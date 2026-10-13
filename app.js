/* TRISHUL VANI — zero-dependency UI driven exclusively by the local FastAPI. */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const state = { noise: 'factory', track: 'raw', report: null, meta: null, playback:false };
const methods = {raw:'Unprocessed input',nlms:'Adaptive NLMS',spectral:'Spectral DSP baseline',rnnoise:'RNNoise AI',hybrid:'TRISHUL Hybrid'};
const player=$('#audio-player');
function notify(message, failure=false) {
  const el=$('#toast'); el.textContent=message; el.style.borderColor=failure?'#c27a66':'#68a57d';
  el.classList.add('show'); clearTimeout(notify.timer); notify.timer=setTimeout(()=>el.classList.remove('show'),5000);
}
async function api(path, options) {
  const response=await fetch(path,options);
  if(!response.ok){let err;try{err=await response.json()}catch{err={}};
    let detail=err.detail || `Server returned ${response.status}`;
    if(Array.isArray(detail)) detail=detail.map(x=>x.msg).join('; ');
    throw new Error(detail);
  }
  return response.json();
}
function num(n, decimals=1){ return typeof n==='number'&&Number.isFinite(n)?n.toFixed(decimals):'—' }
function setBusy(busy,text='Run signal analysis'){$('#run-btn').disabled=busy;$('#run-text').textContent=text;$('#upload-btn').disabled=busy;}
function shortTime(date){try{return new Date(date).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return date||'Unknown'}}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function drawWaveform(values=[]) {
  const canvas=$('#wave-canvas');const ratio=window.devicePixelRatio||1;
  const rect=canvas.getBoundingClientRect();const w=Math.max(100,rect.width),h=Math.max(90,rect.height);
  canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
  const ctx=canvas.getContext('2d'); ctx.scale(ratio,ratio);
  ctx.clearRect(0,0,w,h);
  const mono=document.body.classList.contains('design-v2');
  ctx.strokeStyle=mono?'rgba(140,140,140,.18)':'rgba(151,210,169,.13)';ctx.lineWidth=1;
  for(let x=0;x<w;x+=34){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
  for(let y=0;y<h;y+=34){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  ctx.strokeStyle=mono?'rgba(190,190,190,.4)':'rgba(184,246,178,.33)';ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
  let waves=values.length?values: [];
  let high=Math.max(.03,Math.max(...waves))*1.22;
  let gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,mono?'#f2f2ed':'#b8f6b2');gradient.addColorStop(.5,mono?'#999997':'#5acaa0');gradient.addColorStop(1,mono?'#f2f2ed':'#b8f6b2');
  ctx.strokeStyle=gradient;ctx.lineWidth=Math.max(1.4,w/waves.length*.45);ctx.shadowColor=mono?'#dededa':'#aaffc4';ctx.shadowBlur=7;ctx.beginPath();
  const center=h/2;
  waves.forEach((value,i)=>{const x=(i+.5)*w/waves.length;const len=Math.max(1,Math.min(.95,Math.abs(value)/high))*h*.45;ctx.moveTo(x,center-len);ctx.lineTo(x,center+len)});
  ctx.stroke();ctx.shadowBlur=0;
}
function audioUrl(method){return window.trishulApiUrl(`/api/experiments/${state.report.id}/audio/${method}`)}
function setTrack(track){
  if(!['raw','nlms','spectral','hybrid','rnnoise'].includes(track))return;
  if(state.report && !state.report.metrics[track])return;
  state.track=track;
  $$('.wave-select button').forEach(x=>x.classList.toggle('active',x.dataset.track===track));
  $('#wave-name').textContent=methods[track];
  $('#track-title').textContent=methods[track];
  if(!state.report){$('#track-subtitle').textContent='Generate an experiment to unlock playback';drawWaveform();return;}
  const m=state.report.metrics[track];
  const extra=`SNR: ${num(m.snr_db)} dB · STOI: ${num(m.stoi,3)} · ${state.report.duration_s.toFixed(1)} s`;
  $('#track-subtitle').textContent=extra;
  drawWaveform(state.report.waveforms[track]);
  const link=$('#audio-download');link.href=audioUrl(track);link.download=`trishul-${state.report.id}-${track}.wav`;link.classList.remove('disabled');link.setAttribute('aria-disabled','false');
  player.pause();player.removeAttribute('src');state.playback=false;updatePlayButton();
  player.src=audioUrl(track);
}
function updatePlayButton(){const svg=$('#play-btn use');svg.setAttribute('href',state.playback?'#i-pause':'#i-play');$('#play-btn').setAttribute('aria-label',state.playback?'Pause selected audio':'Play selected audio')}
function renderChart(report){
  const rows=Object.entries(report.metrics);
  const values=rows.map(([,v])=>v.snr_db).filter(v=>typeof v==='number');
  const min=Math.floor(Math.min(-10,...values)/5)*5;
  const max=Math.ceil(Math.max(5,...values)/5)*5;
  $('#snr-chart').innerHTML=values.length?rows.map(([name,m])=>{
    const width=m.snr_db===null?0:Math.max(2,Math.min(100,100*(m.snr_db-min)/(max-min)));
    return `<div class="bar-row ${name}"><span class="bar-label">${escapeHtml(methods[name])}</span><div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div><span class="bar-value">${num(m.snr_db)} dB</span></div>`;
  }).join(''):'<div class="chart-empty">No known clean ground truth for this recording. SNR cannot be computed honestly.</div>';
  const validSNR=typeof report.metrics.hybrid?.snr_db==='number'&&typeof report.metrics.raw?.snr_db==='number';
  const delta=validSNR?report.metrics.hybrid.snr_db-report.metrics.raw.snr_db:null;
  $('#snr-delta').innerHTML=validSNR ? `${delta>=0?'+':''}${num(delta)}<small> dB</small>`:'—';
  $('#snr-explain').textContent=!validSNR?'No clean ground truth supplied. SNR cannot be measured for dual-microphone recordings.':delta>=0?'Measured SNR improvement compared to the unprocessed baseline.':'Measured SNR regression compared to raw. Review the audio and tuning; the hybrid is not guaranteed to win.';
  $('#stoi-result').textContent=num(report.metrics.hybrid?.stoi,3);
  const body=$('#metrics-body');body.innerHTML=rows.map(([name,m])=>`<tr><td>${escapeHtml(methods[name])}</td><td class="value-green">${num(m.snr_db)} dB</td><td>${num(m.stoi,3)}</td><td>${num(m.pesq,3)}</td><td>${num(m.processing_ms,1)} ms</td><td>${num(m.rtf,3)}</td></tr>`).join('');
}
function renderReport(report){
  state.report=report;
  $('#run-tag').textContent=`RUN / ${report.id.toUpperCase()}`;
  $('#wave-type').textContent=`${report.source.toUpperCase()} / WAV · MONO`;
  $('#wave-end').textContent=`00:${num(report.duration_s).padStart(4,'0')}`;
  $('#wave-mid').textContent=`00:${num(report.duration_s/2).padStart(4,'0')}`;
  $('#flow-residual').textContent=report.model==='rnnoise'?'RNNOISE':'SPECTRAL';
  const link=$('#csv-download');link.classList.remove('disabled');link.href=window.trishulApiUrl(`/api/experiments/${report.id}/export.csv`);link.setAttribute('aria-disabled','false');link.download=`trishul-${report.id}.csv`;
  renderChart(report);setTrack(state.track in report.metrics?state.track:'raw');
}
async function run(){
  const body={noise:state.noise,snr_db:Number($('#snr').value),duration_s:Number($('#duration').value),seed:Number($('#seed').value)};
  setBusy(true,'Processing…');
  try{
    const report=await api('/api/experiments/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    renderReport(report);await refreshHistory();notify(`Run ${report.id} complete. All outputs saved and measured.`);
  }catch(err){notify(`Experiment failed: ${err.message}`,true)}finally{setBusy(false)}
}
async function upload(){
  const form=new FormData($('#upload-form'));form.append('snr_db',$('#snr').value);form.append('seed',$('#seed').value);
  if(!form.get('clean')?.size||!form.get('noise')?.size){notify('Provide both clean speech and noise files.',true);return;}
  setBusy(true,'Processing uploaded audio…');
  try{const report=await api('/api/experiments/upload',{method:'POST',body:form});renderReport(report);await refreshHistory();notify('Uploaded samples processed and saved.');}
  catch(err){notify(`Upload failed: ${err.message}`,true)}finally{setBusy(false)}
}
async function uploadDual(){
  const form=new FormData($('#dual-form'));
  if(!form.get('primary')?.size||!form.get('reference')?.size){notify('Both synchronized microphone recordings are required.',true);return;}
  setBusy(true,'Processing microphone capture…');$('#dual-btn').disabled=true;
  try{const report=await api('/api/experiments/dual-mic',{method:'POST',body:form});renderReport(report);await refreshHistory();notify('Dual microphone audio processed. Clean-reference metrics are intentionally unavailable.');}
  catch(e){notify('Dual microphone processing failed: '+e.message,true)}
  finally{setBusy(false);$('#dual-btn').disabled=false}
}
async function refreshHistory(){
  try{
    const runs=await api('/api/experiments');$('#experiment-count').textContent=String(runs.length).padStart(2,'0');
    const el=$('#history-content');
    if(!runs.length){el.innerHTML='<p class="empty-message">No recorded experiments. Each finished experiment is saved locally with its parameters and generated WAV outputs.</p>';return;}
    el.innerHTML=runs.slice(0,14).map(r=>`<button class="history-row" data-id="${escapeHtml(r.id)}"><span><strong>${escapeHtml(r.noise)}</strong><small>${escapeHtml(shortTime(r.created_at))} · ${escapeHtml(r.source)}</small></span><span class="id">${escapeHtml(r.id)}</span><span><strong>${num(r.snr_db)} dB</strong><small>Input SNR</small></span><span><strong>${num(r.metrics?.hybrid?.snr_db)} dB</strong><small>Hybrid output</small></span><span><svg><use href="#i-arrow"/></svg></span></button>`).join('');
    $$('.history-row').forEach(btn=>btn.addEventListener('click',async()=>{try{renderReport(await api(`/api/experiments/${btn.dataset.id}`));document.querySelector('#audio-lab').scrollIntoView({behavior:'smooth'});notify('Experiment loaded.')}catch(e){notify(e.message,true)}}));
  }catch(err){notify('Cannot refresh history: '+err.message,true)}
}
async function loadMeta(){
  const [health,meta]=await Promise.all([api('/api/health'),api('/api/meta')]);
  if(health.status!=='ok')throw new Error('Health check failed');
  state.meta=meta;
  $('#processor-status').textContent='PYTHON PROCESSOR CONNECTED';
  $('#retry-connection').hidden=true;
  $('#hero-ai-state').textContent=meta.capabilities.rnnoise?'RNNOISE ENABLED':'SPECTRAL FALLBACK / NO AI MODEL';
  const capabilities=[['Adaptive NLMS','nlms'],['Spectral DSP baseline','spectral'],['Hybrid reference controller','hybrid'],['Real RNNoise neural enhancement','rnnoise'],['STOI intelligibility scoring','stoi'],['PESQ scoring (optional)','pesq']];
  $('#capability-list').innerHTML=capabilities.map(([label,key])=>`<div class="capability-row"><span>${label}</span><span class="cap-status ${meta.capabilities[key]?'':'off'}">${meta.capabilities[key]?'READY':'NOT CONFIGURED'}</span></div>`).join('');
}
async function loadDatasets(){
  const res=await api('/api/datasets');
  $('#dataset-cards').innerHTML=res.entries.map((data,i)=>`<article class="dataset-card"><span class="data-index">SOURCE / ${String(i+1).padStart(2,'0')}</span><h3>${escapeHtml(data.name)}</h3><span class="data-type">${escapeHtml(data.type)}</span><p>${escapeHtml(data.note)}</p><div class="data-license">LICENSE / ${escapeHtml(data.license)}</div><a class="data-link" href="${escapeHtml(data.url)}" target="_blank" rel="noopener noreferrer">Open official source <svg><use href="#i-external"/></svg></a></article>`).join('');
}
async function init(){
  $('#date-label').textContent=new Date().toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
  $$('.scenario').forEach(btn=>btn.addEventListener('click',()=>{state.noise=btn.dataset.noise;$$('.scenario').forEach(x=>x.classList.toggle('selected',x===btn));}));
  const snr=$('#snr');const updateSNR=()=>{$('#snr-display').textContent=`${snr.value} dB`;snr.style.background=document.body.classList.contains('design-v2')?`linear-gradient(90deg,#242424 ${(Number(snr.value)+15)/35*100}%,#c9c9c3 ${(Number(snr.value)+15)/35*100}%)`:`linear-gradient(90deg,#95efa4 ${(Number(snr.value)+15)/35*100}%,#34493d ${(Number(snr.value)+15)/35*100}%)`};snr.addEventListener('input',updateSNR);updateSNR();
  $('#run-btn').addEventListener('click',run);
  $('#upload-form').addEventListener('submit',event=>{event.preventDefault();upload()});
  $('#dual-form').addEventListener('submit',event=>{event.preventDefault();uploadDual()});
  $$('.file-upload input').forEach(input=>input.addEventListener('change',()=>input.previousElementSibling.textContent=input.files[0]?.name??'Choose audio'));
  $$('.wave-select button').forEach(btn=>btn.addEventListener('click',()=>setTrack(btn.dataset.track)));
  $('#play-btn').addEventListener('click',()=>{if(!state.report){notify('Run an experiment before playing audio.');return}if(state.playback){player.pause()}else{player.play().catch(e=>notify('Cannot play track: '+e.message,true))}});
  player.addEventListener('play',()=>{state.playback=true;updatePlayButton()});player.addEventListener('pause',()=>{state.playback=false;updatePlayButton()});player.addEventListener('ended',()=>{state.playback=false;updatePlayButton()});
  $('#history-refresh').addEventListener('click',refreshHistory);
const mobileViews={overview:'overview','audio-lab':'audio','analytics':'analytics','datasets':'datasets','hardware-lab':'hardware',system:'system'};
function setMobileViewFromHash(){if(!document.body.classList.contains('design-v2')||innerWidth>700){delete document.body.dataset.mobileView;return}const key=location.hash.slice(1);const view=mobileViews[key]||'overview';document.body.dataset.mobileView=view;$$('.nav-item').forEach(item=>{const active=(item.getAttribute('href')==='#'+key)||(view==='overview'&&item.getAttribute('href')==='#overview');item.classList.toggle('active',active);if(active)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current')})}
$$('.nav-item').forEach(item=>item.addEventListener('click',event=>{const href=item.getAttribute('href')||'';if(innerWidth<=700&&document.body.classList.contains('design-v2')&&href.startsWith('#')){event.preventDefault();history.pushState(null,'',href);setMobileViewFromHash();window.scrollTo({top:0,behavior:'smooth'});const target=document.querySelector(href);if(target)target.setAttribute('tabindex','-1');return}$$('.nav-item').forEach(x=>x.classList.toggle('active',x===item))}));
window.addEventListener('hashchange',setMobileViewFromHash);window.addEventListener('popstate',setMobileViewFromHash);window.addEventListener('resize',setMobileViewFromHash);setMobileViewFromHash();
  window.addEventListener('resize',()=>drawWaveform(state.report?.waveforms?.[state.track]));
  drawWaveform();setTrack('raw');
  const checkConnection=async()=>{
    $('#processor-status').textContent='CONNECTING TO PROCESSOR';
    const results=await Promise.allSettled([loadMeta(),refreshHistory(),loadDatasets()]);
    const err=results.find(x=>x.status==='rejected');
    if(results[0].status==='rejected'){
      $('#processor-status').textContent='PROCESSOR UNAVAILABLE';
      $('#retry-connection').hidden=false;
    }
    if(err)notify('Service not fully available: '+err.reason.message,true);
  };
  $('#retry-connection').addEventListener('click',checkConnection);
  await checkConnection();
  const params=new URLSearchParams(location.search);
  const runId=params.get('run');
  if(runId && /^[a-zA-Z0-9_-]{1,80}$/.test(runId)){
    try{
      renderReport(await api(`/api/experiments/${encodeURIComponent(runId)}`));
      setTrack(params.get('track')||'raw');
      notify(`Hardware workbench run ${runId} loaded.`);
    }catch(error){notify(`Could not load linked run: ${error.message}`,true)}
  }
}
init();
