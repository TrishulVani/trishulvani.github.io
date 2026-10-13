(() => {
  if (new URLSearchParams(location.search).get('design') !== '2') return;
  const content = document.querySelector('.main > .content');
  if (!content) return;
  const story = document.createElement('section');
  story.className = 'relaunch-story';
  story.setAttribute('aria-label', 'The signal journey');
  story.innerHTML = `
    <div class="relaunch-stage">
      <canvas id="relaunch-field" aria-hidden="true"></canvas>
      <div class="relaunch-media" aria-hidden="true"><img class="relaunch-chamber" src="/assets/signal-chamber-v2.png" alt=""><div class="relaunch-energy"></div><div class="relaunch-flight-wrap"><img class="relaunch-flight" src="/assets/signal-operator-v2.png" alt=""></div><span class="relaunch-media-index" id="relaunch-media-index">TRANSMISSION 01 / ACQUIRE</span><span class="relaunch-media-corner"></span></div>
      <div class="relaunch-orbit" aria-hidden="true"></div>
      <div class="relaunch-top"><span>त्रिSHUL VANI / 2026</span><span id="relaunch-count">01 / 04</span></div>
      <div class="relaunch-chapter is-current" data-index="0"><span class="relaunch-kicker">SOUND INTELLIGENCE / INDEPENDENT RESEARCH</span><h1>The signal<br><em>survives.</em></h1><p>Discover speech clarity under pressure. A research instrument shaped for the changing acoustic conditions of ground, sea and air.</p><a href="#audio-lab">Enter the audio lab <span aria-hidden="true">↗</span></a></div>
      <div class="relaunch-chapter" data-index="1"><span class="relaunch-kicker">01 / ACQUIRE</span><h2>Listen beyond<br><em>the obvious.</em></h2><p>Primary and reference channels capture the same acoustic world from different positions. Their difference carries useful evidence.</p></div>
      <div class="relaunch-chapter" data-index="2"><span class="relaunch-kicker">02 / SEPARATE</span><h2>Let noise move.<br><em>Keep the voice.</em></h2><p>Adaptive cancellation follows changing interference while the speech path stays measurable and available for comparison.</p></div>
      <div class="relaunch-chapter" data-index="3"><span class="relaunch-kicker">03 / REVEAL</span><h2>Hear the result.<br><em>See the proof.</em></h2><p>Run the real processor, inspect each waveform and spectrogram, and export the evidence. No prerecorded effect replaces the experiment.</p><a href="#audio-lab">Open the working lab <span aria-hidden="true">↗</span></a></div>
      <div class="relaunch-side"><span>SCROLL TO MOVE THROUGH SOUND</span><i></i><span>NO AUTOPLAY AUDIO</span></div>
      <div class="relaunch-progress" aria-hidden="true"><span></span></div>
    </div>`;
  content.prepend(story);
  if (location.hash && document.getElementById(location.hash.slice(1))) {
    requestAnimationFrame(() => document.getElementById(location.hash.slice(1)).scrollIntoView({ behavior: 'instant' }));
  }
  const canvas = document.getElementById('relaunch-field');
  const ctx = canvas.getContext('2d');
  const chapters = [...story.querySelectorAll('.relaunch-chapter')];
  const count = document.getElementById('relaunch-count');
  const mediaIndex = document.getElementById('relaunch-media-index');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pointerX = .5, pointerY = .5, progress = 0, active = -1, raf = 0;
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const path = (p, points) => { for (let i = 1; i < points.length; i++) if (p <= points[i][0]) { const a = points[i - 1], b = points[i], t = clamp((p - a[0]) / (b[0] - a[0])); return a[1] + (b[1] - a[1]) * (t * t * (3 - 2 * t)); } return points.at(-1)[1]; };
  function update() {
    const rect = story.getBoundingClientRect();
    progress = clamp(-rect.top / Math.max(1, story.offsetHeight - innerHeight));
    const expand = clamp(progress / .28);
    const eased = expand * expand * (3 - 2 * expand);
    const compact = innerWidth < 650;
    story.style.setProperty('--media-left', `${(compact ? 5 * (1 - eased) : 43 * (1 - eased)).toFixed(2)}vw`);
    story.style.setProperty('--media-top', `${(compact ? 60 * (1 - eased) : 17 * (1 - eased)).toFixed(2)}vh`);
    story.style.setProperty('--media-width', `${(compact ? 90 + 10 * eased : 52 + 48 * eased).toFixed(2)}vw`);
    story.style.setProperty('--media-height', `${(compact ? 40 + 60 * eased : 67 + 33 * eased).toFixed(2)}vh`);
    story.style.setProperty('--media-radius', `${Math.round(14 * (1 - eased))}px`);
    story.style.setProperty('--media-shade', (.08 + eased * .45).toFixed(3));
    story.style.setProperty('--media-zoom', (1.14 - progress * .1).toFixed(3));
    story.style.setProperty('--flight-left', `${path(progress, compact ? [[0,27],[.3,24],[.58,0],[.86,25],[1,28]] : [[0,44],[.3,49],[.58,7],[.86,43],[1,48]]).toFixed(2)}%`);
    story.style.setProperty('--flight-top', `${path(progress, [[0,5],[.3,3],[.58,6],[.86,2],[1,1]]).toFixed(2)}%`);
    story.style.setProperty('--flight-scale', path(progress, [[0,.82],[.3,.98],[.58,.88],[.86,.98],[1,1.04]]).toFixed(3));
    story.style.setProperty('--flight-rotate', `${path(progress, [[0,-8],[.3,9],[.58,-18],[.86,21],[1,28]]).toFixed(2)}deg`);
    story.style.setProperty('--chamber-shift', `${(-18 * progress).toFixed(2)}%`);
    story.style.setProperty('--energy-scale', (1 + progress * .65).toFixed(3));
    story.style.setProperty('--art-x', `${(-12 * progress).toFixed(2)}vw`);
    story.style.setProperty('--art-y', `${(5 * progress).toFixed(2)}vh`);
    story.style.setProperty('--art-rot-y', `${Math.round(140 * progress)}deg`);
    story.style.setProperty('--art-rot-z', `${Math.round(18 * progress)}deg`);
    story.style.setProperty('--art-scale', (1 - progress * .3).toFixed(3));
    story.style.setProperty('--art-opacity', clamp(1 - progress * 3.7).toFixed(3));
    story.style.setProperty('--orbit-x', `${Math.round(72 - progress * 45)}deg`);
    story.style.setProperty('--orbit-z', `${Math.round(progress * 170)}deg`);
    story.style.setProperty('--orbit-scale', (.7 + progress * .6).toFixed(3));
    const index = Math.min(3, Math.floor(progress * 4));
    if (index !== active) { active = index; chapters.forEach((chapter, i) => chapter.classList.toggle('is-current', i === index)); count.textContent = `0${index + 1} / 04`; mediaIndex.textContent = ['TRANSMISSION 01 / ACQUIRE','TRANSMISSION 02 / TRACK','TRANSMISSION 03 / SEPARATE','TRANSMISSION 04 / REVEAL'][index]; story.dataset.chapter = String(index); }
    story.style.setProperty('--story-progress', progress.toFixed(4));
  }
  function draw(time) {
    const box = story.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight) { raf = 0; return; }
    const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio || 1, 1.5);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    ctx.clearRect(0, 0, w, h);
    const centerX = w * (.68 + (pointerX - .5) * .045), centerY = h * (.48 + (pointerY - .5) * .04);
    for (let ring = 0; ring < 25; ring++) {
      const radius = ((ring / 25 + progress * .5 + (reduce ? 0 : time * .000025)) % 1) * Math.max(w, h) * .85;
      ctx.beginPath(); ctx.ellipse(centerX, centerY, radius, radius * (.45 + progress * .22), progress * .15, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(171,191,205,${(.13 * (1 - radius / (Math.max(w, h) * .85))).toFixed(3)})`;
      ctx.lineWidth = ring % 5 === 0 ? 1.4 : .6; ctx.stroke();
    }
    if (active >= 1) {
      const yBase = h * .66;
      for (let line = 0; line < 20; line++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 9) {
          const envelope = Math.exp(-Math.pow((x - centerX) / (w * .36), 2));
          const wave = Math.sin(x * .018 + line * .31 + (reduce ? 0 : time * .001)) * envelope * (8 + active * 8);
          const y = yBase + (line - 10) * 13 + wave;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(214,170,121,${.016 + line / 170})`; ctx.stroke();
      }
    }
    raf = requestAnimationFrame(draw);
  }
  story.addEventListener('pointermove', e => { pointerX = e.clientX / innerWidth; pointerY = e.clientY / innerHeight; story.style.setProperty('--media-drift-x', `${Math.round((pointerX - .5) * -24)}px`); story.style.setProperty('--media-drift-y', `${Math.round((pointerY - .5) * -16)}px`); story.style.setProperty('--flight-pointer-x', `${Math.round((pointerX - .5) * 35)}px`); story.style.setProperty('--flight-pointer-y', `${Math.round((pointerY - .5) * 26)}px`); }, { passive: true });
  addEventListener('scroll', update, { passive: true }); addEventListener('resize', update);
  update(); raf = requestAnimationFrame(draw);
  new IntersectionObserver(entries => { if (entries[0].isIntersecting && !raf) raf = requestAnimationFrame(draw); }, { rootMargin: '100px' }).observe(story);
})();
