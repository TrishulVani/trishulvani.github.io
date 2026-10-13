(() => {
  const $ = id => document.getElementById(id);
  const status = $('sample-status');
  const audio = $('comparison-audio');
  let sample = null;
  const safeId = id => /^[a-f0-9]{12}$/.test(id || '');
  const reportError = error => error instanceof Error ? error.message : String(error);
  function drawWave(values) {
    if (!Array.isArray(values) || !values.length) return;
    const canvas = $('comparison-wave'), ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const peak = Math.max(.01, ...values);
    ctx.strokeStyle = '#a8bbff'; ctx.lineWidth = 2; ctx.beginPath();
    values.forEach((value, index) => {
      const x = index / (values.length - 1) * canvas.width;
      const height = Math.max(1, value / peak * canvas.height * .42);
      ctx.moveTo(x, canvas.height / 2 - height);
      ctx.lineTo(x, canvas.height / 2 + height);
    });
    ctx.stroke();
    canvas.setAttribute('aria-label', 'Measured RMS envelope of the selected synthetic engine output');
  }
  async function drawMeasuredSpectrum(record) {
    const caption = $('spectrum-caption');
    caption.textContent = 'Computing a real STFT from the synthetic engine output…';
    try {
      const response = await fetch(`/api/experiments/${record.id}/audio/raw`, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('WAV unavailable');
      const wav = await response.blob();
      const form = new FormData();
      form.append('file', wav, 'synthetic-engine-example.wav');
      form.append('provenance', `Synthetic त्रिSHUL VANI engine experiment ${record.id}`);
      const session = await json('/api/spectral/sessions', { method: 'POST', body: form });
      if (!/^[a-f0-9]{16}$/.test(session.id || '')) throw new Error('Invalid spectral session');
      const view = await json(`/api/spectral/sessions/${session.id}/view`);
      const rows = view.db, canvas = $('story-spectrum'), ctx = canvas.getContext('2d');
      if (!Array.isArray(rows) || !rows.length || !rows[0]?.length) throw new Error('Empty STFT result');
      const width = canvas.width, height = canvas.height;
      const frame = ctx.createImageData(width, height);
      const columns = rows[0].length;
      for (let y = 0; y < height; y++) {
        const hz = 80 * Math.pow(100, 1 - y / height);
        const bin = Math.min(rows.length - 1, Math.round(hz / 15.625));
        for (let x = 0; x < width; x++) {
          const db = rows[bin][Math.min(columns - 1, Math.floor(x / width * columns))];
          const energy = Math.pow(Math.max(0, Math.min(1, (db + 85) / 65)), 1.7);
          const i = (y * width + x) * 4;
          frame.data[i] = Math.round(8 + 178 * energy);
          frame.data[i + 1] = Math.round(12 + 194 * energy);
          frame.data[i + 2] = Math.round(27 + 228 * energy);
          frame.data[i + 3] = 255;
        }
      }
      ctx.putImageData(frame, 0, 0);
      canvas.setAttribute('aria-label', `Measured STFT spectrogram of the ${record.duration_s}-second synthetic engine example`);
      caption.textContent = 'Measured STFT of the synthetic engine example · log-frequency view · 16 kHz · Hann window · 1024 FFT / 256 hop.';
    } catch (error) { caption.textContent = `Spectrogram unavailable: ${reportError(error)}. Open Studio to retry.`; }
  }
  async function json(url, options) {
    const response = await fetch(url, { credentials: 'same-origin', ...options });
    if (!response.ok) throw new Error(`Processor request failed (${response.status})`);
    return response.json();
  }
  async function loadMeta() {
    try {
      const [health, meta] = await Promise.all([json('/api/health'), json('/api/meta')]);
      if (health.status !== 'ok') throw new Error('Processor unavailable');
      $('residual-name').textContent = meta.capabilities?.rnnoise ? 'Verified RNNoise' : 'Spectral DSP';
      $('residual-note').textContent = meta.capabilities?.rnnoise ? 'Configured neural residual model' : 'DSP fallback; not neural AI';
      $('hybrid-label').textContent = meta.capabilities?.rnnoise ? 'NLMS + verified RNNoise' : 'NLMS + spectral DSP fallback';
    } catch {
      $('residual-note').textContent = 'Processor unavailable; reconnect in the lab';
    }
  }
  async function loadEvidence() {
    const container = $('evidence-content');
    try {
      const runs = await json('/api/experiments');
      if (!Array.isArray(runs) || !runs.length) { container.textContent = 'No experiments saved for this visitor yet. Start one in the laboratory.'; return; }
      const run = runs[0];
      const label = run.source === 'synthetic' ? 'Synthetic demonstration' : run.source === 'raw_dual_microphone' ? 'Uploaded dual-mic capture' : 'Uploaded audio';
      const date = run.created_at ? new Date(run.created_at).toLocaleString() : 'Date unavailable';
      container.textContent = `${label} · ${date}. Open the lab for measured per-method results and any unavailable metrics.`;
    } catch { container.textContent = 'The processor is unavailable. You can still explore the story or open the lab to retry.'; }
  }
  $('generate').addEventListener('click', async () => {
    $('generate').disabled = true;
    status.textContent = 'Generating an original synthetic sample with the research engine…';
    try {
      const record = await json('/api/experiments/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noise: 'factory', snr_db: 0, duration_s: 3, seed: 42 }) });
      if (!safeId(record.id)) throw new Error('Processor returned an invalid experiment ID');
      sample = record;
      $('play-raw').disabled = false;
      $('play-hybrid').disabled = false;
      $('sample-tag').textContent = `SYNTHETIC / ${record.id.toUpperCase()}`;
      drawWave(record.waveforms?.raw);
      drawMeasuredSpectrum(record);
      status.textContent = 'Synthetic example ready. Choose a track, then press Play in the audio controls.';
      $('audio-caption').textContent = 'Original engine output · synthetic formant-like tone · not intelligible speech.';
      loadEvidence();
    } catch (error) { status.textContent = `Could not generate the example: ${reportError(error)}. Open the lab to retry.`; }
    finally { $('generate').disabled = false; }
  });
  for (const method of ['raw', 'hybrid']) {
    $(`play-${method}`).addEventListener('click', () => {
      if (!sample || !safeId(sample.id)) return;
      audio.pause();
      audio.src = window.trishulApiUrl(`/api/experiments/${sample.id}/audio/${method}`);
      drawWave(sample.waveforms?.[method]);
      audio.load();
      $('audio-caption').textContent = `${method === 'raw' ? 'Raw primary mixture' : 'Hybrid output'} · synthetic engine example · press Play to listen.`;
      audio.focus();
    });
  }
  const progress = document.querySelector('.chapter-progress span');
  if ('IntersectionObserver' in window) {
    const links = [...document.querySelectorAll('.chapter-rail a')];
    const chapterObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        links.forEach(link => link.removeAttribute('aria-current'));
        links.find(link => link.hash === `#${entry.target.id}`)?.setAttribute('aria-current', 'location');
      }
    }, { rootMargin: '-30% 0px -55% 0px' });
    document.querySelectorAll('main section').forEach(section => chapterObserver.observe(section));
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const field = $('signal-tunnel');
  const fieldContext = field.getContext('2d');
  const fieldState = { x: .5, y: .5, targetX: .5, targetY: .5, energy: 0, active: false, frame: 0 };
  const fieldHero = $('hero');
  function sizeField() {
    const pixelRatio = Math.min(2, devicePixelRatio || 1);
    field.width = Math.round(fieldHero.clientWidth * pixelRatio);
    field.height = Math.round(fieldHero.clientHeight * pixelRatio);
    fieldContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawField(0, false);
  }
  function drawField(time, schedule = true) {
    const width = fieldHero.clientWidth, height = fieldHero.clientHeight;
    fieldContext.clearRect(0, 0, width, height);
    fieldState.x += (fieldState.targetX - fieldState.x) * .055;
    fieldState.y += (fieldState.targetY - fieldState.y) * .055;
    fieldState.energy *= .966;
    const pointerX = fieldState.x * width, pointerY = fieldState.y * height;
    const radius = Math.max(160, width * .22);
    const rows = 24, columns = 74;
    for (let row = 0; row < rows; row++) {
      const depth = row / (rows - 1);
      const baseY = height * (.18 + depth * .67);
      fieldContext.beginPath();
      for (let column = 0; column <= columns; column++) {
        const x = column / columns * width;
        const dx = x - pointerX, dy = baseY - pointerY;
        const distance = Math.hypot(dx, dy);
        const influence = Math.exp(-distance * distance / (radius * radius));
        const ambient = reduced ? 0 : Math.sin(x * .007 + time * .00055 + row * .34) * (3 + depth * 6);
        const ripple = reduced ? 0 : influence * fieldState.energy * Math.sin(distance * .025 - time * .007) * (26 + depth * 30);
        const y = baseY + ambient + ripple;
        if (column === 0) fieldContext.moveTo(x, y); else fieldContext.lineTo(x, y);
      }
      fieldContext.strokeStyle = `rgba(169,190,255,${(.055 + depth * .12).toFixed(3)})`;
      fieldContext.lineWidth = depth > .7 ? 1.2 : .8;
      fieldContext.stroke();
    }
    if (fieldState.energy > .02 && !reduced) {
      const glow = fieldContext.createRadialGradient(pointerX, pointerY, 0, pointerX, pointerY, radius);
      glow.addColorStop(0, `rgba(168,187,255,${(.1 * fieldState.energy).toFixed(3)})`);
      glow.addColorStop(1, 'rgba(168,187,255,0)');
      fieldContext.fillStyle = glow;
      fieldContext.fillRect(pointerX - radius, pointerY - radius, radius * 2, radius * 2);
    }
    if (!reduced && fieldState.active && schedule) fieldState.frame = requestAnimationFrame(drawField);
  }
  sizeField();
  addEventListener('resize', sizeField, { passive: true });
  if (!reduced && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const visible = entries[0]?.isIntersecting;
      if (visible && !fieldState.active) { fieldState.active = true; fieldState.frame = requestAnimationFrame(drawField); }
      else if (!visible && fieldState.active) { fieldState.active = false; cancelAnimationFrame(fieldState.frame); }
    }, { threshold: 0 }).observe(fieldHero);
  } else if (!reduced) {
    fieldState.active = true;
    fieldState.frame = requestAnimationFrame(drawField);
  }
  if (!reduced && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('entered');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12 });
    document.querySelectorAll('.scene').forEach(scene => observer.observe(scene));
    document.body.classList.add('motion-ready');
  }
  if (!reduced && matchMedia('(pointer:fine)').matches) {
    const hero = document.querySelector('.hero');
    const object = document.querySelector('.hero-object');
    hero.addEventListener('pointermove', event => {
      const x = (event.clientX / innerWidth - .5) * 16;
      const y = (event.clientY / innerHeight - .5) * 12;
      object.style.setProperty('--tilt-x', `${x}px`);
      object.style.setProperty('--tilt-y', `${y}px`);
      const bounds = hero.getBoundingClientRect();
      fieldState.targetX = (event.clientX - bounds.left) / bounds.width;
      fieldState.targetY = (event.clientY - bounds.top) / bounds.height;
      fieldState.energy = Math.min(1, fieldState.energy + .35);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      object.style.setProperty('--tilt-x', '0px');
      object.style.setProperty('--tilt-y', '0px');
    });
  }
  let scheduled = false;
  const concept = $('concept');
  const problem = $('problem');
  const policies = $('policies');
  const spectral = $('spectral');
  function sceneMotion() {
    if (reduced) return;
    const normalized = element => {
      const box = element.getBoundingClientRect();
      return Math.max(-1, Math.min(1, (innerHeight * .5 - box.top - box.height * .5) / (innerHeight + box.height) * 2));
    };
    const conceptPosition = normalized(concept);
    concept.style.setProperty('--portal-scale', `${(1.1 + conceptPosition * .3).toFixed(3)}`);
    policies.style.setProperty('--portal-scale', `${(1.05 + normalized(policies) * .3).toFixed(3)}`);
    policies.style.setProperty('--shadow-x', `${Math.round(normalized(policies) * -150)}px`);
    policies.style.setProperty('--shadow-y', `${Math.round(normalized(policies) * 95)}px`);
    spectral.style.setProperty('--portal-scale', `${(1.05 + normalized(spectral) * .3).toFixed(3)}`);
    concept.style.setProperty('--float-a', `${Math.round(conceptPosition * -85)}px`);
    concept.style.setProperty('--float-b', `${Math.round(conceptPosition * 100)}px`);
    concept.style.setProperty('--wave-y', `${Math.round(conceptPosition * 32)}px`);
    concept.style.setProperty('--wave-scale', `${(1 + conceptPosition * .14).toFixed(3)}`);
    problem.style.setProperty('--photo-y', `${Math.round(normalized(problem) * 45)}px`);
    problem.querySelector('.instrument').style.setProperty('--instrument-rise', `${Math.round(normalized(problem) * -48)}px`);
    problem.querySelector('.instrument').style.setProperty('--instrument-turn', `${(normalized(problem) * -5).toFixed(2)}deg`);
    concept.querySelectorAll('.signal-path li').forEach((item, index) => {
      item.style.setProperty('--path-y', `${Math.round(conceptPosition * (index - 2) * 19)}px`);
      item.style.setProperty('--path-turn', `${(conceptPosition * (index - 2) * 2.2).toFixed(2)}deg`);
    });
    policies.querySelectorAll('.policy-grid article').forEach((card, index) => {
      const progress = normalized(policies);
      card.style.setProperty('--policy-y', `${Math.round(progress * (index - 1) * 48)}px`);
      if (!card.matches(':hover')) {
        card.style.setProperty('--card-x', `${(progress * (index - 1) * 5).toFixed(2)}deg`);
        card.style.setProperty('--card-y', `${(progress * (index - 1) * -7).toFixed(2)}deg`);
      }
    });
    const air = policies.querySelector('.visual-impulse');
    air.style.setProperty('--air-x', `${Math.round(normalized(policies) * 14)}%`);
    air.style.setProperty('--air-y', `${Math.round(normalized(policies) * -12)}%`);
    air.style.setProperty('--air-scale', `${(1 + normalized(policies) * .15).toFixed(3)}`);
    air.style.setProperty('--flutter-y', `${Math.round(normalized(policies) * 30)}px`);
    spectral.style.setProperty('--spectrum-roll', `${(normalized(spectral) * -7).toFixed(2)}deg`);
    spectral.style.setProperty('--spectrum-y', `${Math.round(normalized(spectral) * 25)}px`);
    const evidence = $('evidence');
    evidence.style.setProperty('--evidence-y', `${Math.round(normalized(evidence) * -65)}px`);
    evidence.style.setProperty('--evidence-turn', `${(normalized(evidence) * 7).toFixed(2)}deg`);
  }
  addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      sceneMotion();
      scheduled = false;
    });
  }, { passive: true });
  sceneMotion();
  if (!reduced && matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.policy-grid article').forEach(card => {
      card.addEventListener('pointermove', event => {
        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - .5;
        const y = (event.clientY - bounds.top) / bounds.height - .5;
        card.style.setProperty('--card-x', `${(-y * 13).toFixed(2)}deg`);
        card.style.setProperty('--card-y', `${(x * 13).toFixed(2)}deg`);
      }, { passive: true });
      card.addEventListener('pointerleave', sceneMotion);
    });
    const poster = document.querySelector('.instrument-poster');
    poster.addEventListener('pointermove', event => {
      const bounds = poster.getBoundingClientRect();
      poster.style.setProperty('--poster-x', `${Math.round(((event.clientX - bounds.left) / bounds.width - .5) * 18)}px`);
      poster.style.setProperty('--poster-y', `${Math.round(((event.clientY - bounds.top) / bounds.height - .5) * 12)}px`);
    }, { passive: true });
    poster.addEventListener('pointerleave', () => {
      poster.style.setProperty('--poster-x', '0px');
      poster.style.setProperty('--poster-y', '0px');
    });
    const stage = document.querySelector('.floating-stage');
    concept.addEventListener('pointermove', event => {
      const bounds = concept.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      stage.style.setProperty('--stage-x', `${Math.round(x * 28)}px`);
      stage.style.setProperty('--stage-y', `${Math.round(y * 22)}px`);
      stage.style.setProperty('--stage-turn', `${(x * -7).toFixed(2)}deg`);
    }, { passive: true });
    concept.addEventListener('pointerleave', () => {
      stage.style.setProperty('--stage-x', '0px');
      stage.style.setProperty('--stage-y', '0px');
      stage.style.setProperty('--stage-turn', '0deg');
    });
  }
  const portal = document.createElement('div');
  portal.className = 'launch-portal';
  portal.setAttribute('aria-hidden', 'true');
  portal.innerHTML = '<div class="throw-object">' + Array.from({ length: 6 }, (_, layer) => `<img src="/mark-v2.svg" alt="" style="--layer:${layer}">`).join('') + '</div><strong>ENTER THE SIGNAL</strong>';
  document.body.append(portal);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="/index.html"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reduced) return;
    event.preventDefault();
    if (portal.classList.contains('is-active')) return;
    portal.classList.add('is-active');
    setTimeout(() => {
      try { sessionStorage.setItem('tv-v2-arrival', '1'); } catch (_) { /* Navigation still works without storage. */ }
      location.assign(link.href);
    }, 1320);
  });
  loadMeta();
  loadEvidence();
})();
