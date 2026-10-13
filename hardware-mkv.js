(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const frame = $('mkv-assembly-frame');
  const audio = $('mkv-audio');
  const state = { report: null, track: 'raw', pending: null, request: 0 };
  const tracks = ['raw', 'nlms', 'spectral', 'hybrid', 'rnnoise'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (value, digits = 2) => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'N/A';
  const clock = sec => `${Math.floor((Number(sec) || 0) / 60)}:${((Number(sec) || 0) % 60).toFixed(1).padStart(4, '0')}`;
  const audioUrl = track => window.trishulApiUrl(`/api/experiments/${encodeURIComponent(state.report.id)}/audio/${track}`);
  function loadAssembly() { if (!frame.src) frame.src = '/hardware.html?embed=1#model'; }
  new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadAssembly(); }, { rootMargin: '300px' }).observe($('assembly'));
  addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'tv-hardware-height') return;
    const height = Number(event.data.height);
    if (Number.isFinite(height) && height > 400 && height < 16000) frame.style.height = `${Math.ceil(height)}px`;
  });
  document.querySelectorAll('[data-assembly-target]').forEach(button => button.addEventListener('click', () => {
    loadAssembly();
    frame.contentWindow?.postMessage({ type: 'tv-hardware-go', target: button.dataset.assemblyTarget }, location.origin);
    frame.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }));
  async function checkBackend() {
    try {
      const response = await fetch('/api/meta', { cache: 'no-store' });
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const meta = await response.json();
      $('backend-dot').classList.add('ok');
      $('backend-status').textContent = 'OFFLINE PYTHON DSP CONNECTED';
      $('rnnoise-status').textContent = meta.capabilities?.rnnoise ? 'GENUINE RNNOISE AVAILABLE' : 'RNNOISE NOT CONFIGURED';
    } catch (_) {
      $('backend-status').textContent = 'AUDIO PROCESSOR UNAVAILABLE';
      $('rnnoise-status').textContent = '3D AND ENGINEERING VIEWS REMAIN AVAILABLE';
      $('mkv-run').disabled = true;
      $('mkv-run-status').textContent = 'The Python backend is unreachable. No audio result will be invented.';
    }
  }
  function drawEnvelope(canvas, values, color, scale) {
    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = '#55745d'; context.beginPath(); context.moveTo(0, height / 2); context.lineTo(width, height / 2); context.stroke();
    if (!Array.isArray(values) || !values.length) return;
    context.fillStyle = color;
    for (let i = 0; i < values.length; i++) {
      const x = i / values.length * width;
      const amplitude = Math.min(1, Math.max(0, values[i] / scale));
      const bar = Math.max(2, amplitude * (height - 10));
      context.fillRect(x, (height - bar) / 2, Math.max(1, width / values.length - 1), bar);
    }
  }
  function renderEvidence() {
    const report = state.report;
    if (!report) return;
    $('mkv-run-id').textContent = `RUN ${report.id.toUpperCase()} · ${report.source.toUpperCase()}`;
    $('mkv-selected-wave-label').textContent = `${state.track.toUpperCase()} / PCM RMS ENVELOPE`;
    const rawEnvelope = report.waveforms?.raw || [];
    const selectedEnvelope = report.waveforms?.[state.track] || [];
    const commonScale = Math.max(.03, ...rawEnvelope, ...selectedEnvelope);
    drawEnvelope($('mkv-raw-wave'), rawEnvelope, '#8eaa91', commonScale);
    drawEnvelope($('mkv-selected-wave'), selectedEnvelope, '#d9b77d', commonScale);
    document.querySelectorAll('[data-track]').forEach(button => {
      button.classList.toggle('selected', button.dataset.track === state.track);
      button.disabled = !report.metrics?.[button.dataset.track];
    });
    const metric = report.metrics?.[state.track] || {};
    const input = report.metrics?.raw || {};
    const gain = typeof metric.snr_db === 'number' && typeof input.snr_db === 'number' ? metric.snr_db - input.snr_db : null;
    $('mkv-metrics').innerHTML = `<div>Output SNR<strong>${fmt(metric.snr_db)} dB</strong></div><div>Δ vs RAW<strong>${gain === null ? 'N/A' : `${gain >= 0 ? '+' : ''}${fmt(gain)} dB`}</strong></div><div>STOI / PESQ<strong>${fmt(metric.stoi, 3)} / ${fmt(metric.pesq, 3)}</strong></div><div>Host processing<strong>${fmt(metric.processing_ms, 1)} ms</strong></div>`;
    $('mkv-download').href = audioUrl(state.track);
    $('mkv-download').download = `trishul-${report.id}-${state.track}.wav`;
    $('mkv-download').setAttribute('aria-disabled', 'false');
    $('mkv-full-lab').href = `/index.html?design=2&run=${encodeURIComponent(report.id)}&track=${state.track}#audio-lab`;
  }
  function selectTrack(track) {
    if (!state.report || !tracks.includes(track) || !state.report.metrics?.[track]) return;
    const wasPlaying = !audio.paused;
    const position = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    audio.pause();
    state.track = track;
    renderEvidence();
    const request = ++state.request;
    state.pending = { request, position, wasPlaying };
    audio.src = audioUrl(track);
    audio.load();
    $('mkv-play').textContent = wasPlaying ? 'Switching track…' : 'Play selected track';
  }
  audio.addEventListener('loadedmetadata', () => {
    const pending = state.pending;
    if (!pending || pending.request !== state.request) return;
    audio.currentTime = Math.min(pending.position, Math.max(0, audio.duration - .01));
    $('mkv-seek').max = String(audio.duration);
    $('mkv-seek').value = String(audio.currentTime);
    $('mkv-duration').textContent = clock(audio.duration);
    if (pending.wasPlaying) audio.play().catch(() => { $('mkv-run-status').textContent = 'Playback needs a user gesture. Press Play.'; });
    state.pending = null;
    $('mkv-play').textContent = audio.paused ? 'Play selected track' : 'Pause selected track';
  });
  audio.addEventListener('timeupdate', () => { $('mkv-seek').value = String(audio.currentTime); $('mkv-clock').textContent = clock(audio.currentTime); });
  audio.addEventListener('play', () => { $('mkv-play').textContent = 'Pause selected track'; });
  audio.addEventListener('pause', () => { if (!state.pending) $('mkv-play').textContent = 'Play selected track'; });
  $('mkv-play').addEventListener('click', () => {
    if (!state.report) return;
    if (audio.paused) audio.play().catch(error => { $('mkv-run-status').textContent = `Playback unavailable: ${error.message}`; });
    else audio.pause();
  });
  $('mkv-seek').addEventListener('input', () => { if (state.report) audio.currentTime = Number($('mkv-seek').value); });
  $('mkv-ab').addEventListener('click', () => selectTrack(state.track === 'raw' ? 'hybrid' : 'raw'));
  document.querySelectorAll('[data-track]').forEach(button => button.addEventListener('click', () => selectTrack(button.dataset.track)));
  $('mkv-mute').addEventListener('change', () => { audio.muted = $('mkv-mute').checked; });
  $('mkv-volume').addEventListener('input', () => { audio.volume = Number($('mkv-volume').value); });
  audio.muted = true; audio.volume = .2;
  $('mkv-run').addEventListener('click', async () => {
    const snr_db = Number($('mkv-snr').value), seed = Number($('mkv-seed').value), noise = $('mkv-noise').value;
    if (!Number.isFinite(snr_db) || snr_db < -15 || snr_db > 20 || !Number.isInteger(seed) || seed < 0 || seed > 2147483647) { $('mkv-run-status').textContent = 'Enter an SNR from −15 to 20 dB and a nonnegative integer seed.'; return; }
    $('mkv-run').disabled = true; $('mkv-run-status').textContent = 'Processing a synthetic source with the actual offline Python engine…';
    try {
      const response = await fetch('/api/experiments/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noise, snr_db, seed, duration_s: 3 }) });
      if (!response.ok) throw Error(`Processor returned HTTP ${response.status}`);
      const report = await response.json();
      if (!report?.id || !report?.metrics?.raw || !report?.metrics?.hybrid || !report?.waveforms?.raw) throw Error('Experiment response is incomplete');
      state.report = report;
      $('mkv-play').disabled = false; $('mkv-ab').disabled = false; $('mkv-seek').disabled = false;
      $('mkv-run-status').textContent = `Software run ${report.id} complete. ${report.model === 'rnnoise' ? 'Genuine RNNoise backend reported.' : 'Hybrid uses spectral DSP fallback; no neural claim.'} Muted until you uncheck Muted.`;
      selectTrack('raw');
    } catch (error) { $('mkv-run-status').textContent = `No audio result: ${escape(error.message)}`; }
    finally { $('mkv-run').disabled = false; }
  });
  checkBackend();
})();
