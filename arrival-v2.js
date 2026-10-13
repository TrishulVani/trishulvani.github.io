(() => {
  const arrival = document.getElementById('arrival');
  if (!arrival) return;
  if (new URLSearchParams(location.search).get('story') === '1') { arrival.remove(); return; }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const anchor = arrival.querySelector('.arrival-weapon-anchor');
  const weapon = arrival.querySelector('.arrival-weapon-body');
  const label = document.getElementById('arrival-stage');
  const meter = document.getElementById('arrival-meter');
  const canvas = document.getElementById('arrival-field');
  const ctx = canvas.getContext('2d');
  const stages = ['01 / THE AWAKENING', '02 / THE TURN', '03 / THE THROW', '04 / THE IMPACT', '05 / ENTER'];
  const clamp = n => Math.min(1, Math.max(0, n));
  const ease = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
  const part = (p, a, b) => ease((p - a) / (b - a));
  const mix = (a, b, t) => a + (b - a) * t;
  const stars = Array.from({ length: 110 }, (_, i) => ({ x: (i * .6180339887 + .137) % 1, y: (i * .7548776662 + .379) % 1, size: i % 11 === 0 ? 1.5 : .65 }));
  let target = 0, visual = 0, raf = 0, closed = false, touchY = null, finishTimer = 0;

  function go() {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(raf);
    clearTimeout(finishTimer);
    try { sessionStorage.setItem('tv-v2-arrival', '1'); } catch (_) { /* Navigation still works. */ }
    // The landing story is already underneath the intro. Reveal it in place
    // so GitHub Pages never reloads the intro route or sends visitors to the lab.
    arrival.classList.add('is-exiting');
    setTimeout(() => arrival.remove(), 900);
  }
  function advance(amount) {
    if (closed) return;
    target = clamp(target + amount);
    if (target < .999) { clearTimeout(finishTimer); finishTimer = 0; }
    else if (!finishTimer) finishTimer = setTimeout(go, reduce ? 350 : 1450);
    arrival.classList.toggle('is-moving', target > .012);
    if (!raf) raf = requestAnimationFrame(tick);
  }
  arrival.addEventListener('wheel', event => {
    event.preventDefault();
    advance(event.deltaY / (event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? 3 : 1900));
  }, { passive: false });
  arrival.addEventListener('touchstart', event => { touchY = event.touches[0]?.clientY ?? null; }, { passive: true });
  arrival.addEventListener('touchmove', event => {
    if (touchY === null) return;
    event.preventDefault();
    const next = event.touches[0].clientY;
    advance((touchY - next) / (innerHeight * 1.85));
    touchY = next;
  }, { passive: false });
  arrival.addEventListener('touchend', () => { touchY = null; });
  document.getElementById('arrival-skip').addEventListener('click', go);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { go(); return; }
    if (['ArrowDown', 'PageDown', ' ', 'ArrowUp', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      advance(['ArrowUp', 'PageUp'].includes(event.key) ? -.16 : .16);
    }
  });

  function draw(p) {
    const dpr = Math.min(devicePixelRatio || 1, 1.5), w = innerWidth, h = innerHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ctx.clearRect(0, 0, w, h);
    const cx = w * .5, cy = h * .47;
    const turn = part(p, .12, .41), flight = part(p, .38, .7), rush = part(p, .67, .94);
    for (const star of stars) {
      ctx.beginPath();
      ctx.arc(cx + (star.x - .5) * w * (1 + rush * .32), cy + (star.y - .5) * h * (1 + rush * .32), star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,205,172,${(.11 + (star.size > 1 ? .24 : .04) + rush * .15).toFixed(3)})`;
      ctx.fill();
    }
    for (let i = 0; i < 8; i++) {
      const radius = 90 + i * 79 + flight * 60;
      ctx.beginPath(); ctx.ellipse(cx, cy, radius, radius * (1 - turn * .72), turn * .06, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(163,187,145,${(.12 - i * .011 + flight * .06).toFixed(3)})`;
      ctx.lineWidth = i % 3 === 0 ? 1.2 : .6; ctx.stroke();
    }
    if (flight > 0) for (let i = 0; i < 24; i++) {
      const y = cy + (i - 12) * (5 + rush * 10) + Math.sin(i * 2.4) * 16;
      const end = cx + w * (.02 + flight * .27) + (i % 5) * 8;
      const start = end - w * (.18 + flight * .56) - (i % 7) * 25;
      const gradient = ctx.createLinearGradient(start, y, end, y);
      gradient.addColorStop(0, 'rgba(53,118,94,0)');
      gradient.addColorStop(.55, `rgba(151,192,149,${(.08 + flight * .13).toFixed(3)})`);
      gradient.addColorStop(1, `rgba(232,191,118,${(.13 + flight * .5).toFixed(3)})`);
      ctx.beginPath(); ctx.moveTo(start, y); ctx.lineTo(end, y + (i - 12) * rush * 2);
      ctx.strokeStyle = gradient; ctx.lineWidth = i % 6 === 0 ? 2.3 : .8; ctx.stroke();
    }
  }
  function render(p) {
    const turn = part(p, .12, .41), flight = part(p, .38, .7), rush = part(p, .67, .94), impact = part(p, .89, 1);
    const scale = mix(1, .9, turn) * mix(1, 1.25, flight) * mix(1, 7.2, rush * rush);
    const x = innerWidth * (.12 * flight - .08 * rush), y = innerHeight * (-.035 * turn + .05 * rush);
    anchor.style.transform = reduce ? 'translate3d(-50%,-50%,0)' : `translate3d(calc(-50% + ${x.toFixed(2)}px),calc(-50% + ${y.toFixed(2)}px),${(rush * 180).toFixed(1)}px) scale(${scale.toFixed(4)})`;
    if (arrival.classList.contains('is-moving')) weapon.style.transform = reduce ? 'none' : `rotateZ(${(90 * turn).toFixed(2)}deg) rotateX(${(-10 * turn).toFixed(2)}deg) rotateY(${(18 * Math.sin(flight * Math.PI * 2) + 24 * rush).toFixed(2)}deg)`;
    else weapon.style.removeProperty('transform');
    arrival.style.setProperty('--arrival-progress', p.toFixed(4));
    arrival.style.setProperty('--arrival-trails', (flight * (1 - part(p, .86, .98))).toFixed(4));
    arrival.style.setProperty('--arrival-impact', impact.toFixed(4));
    arrival.style.setProperty('--arrival-word-opacity', part(p, .91, .985).toFixed(4));
    arrival.style.setProperty('--arrival-beats-opacity', (1 - part(p, .82, .94)).toFixed(4));
    arrival.style.setProperty('--arrival-word-y', `${Math.round(42 * (1 - impact))}px`);
    anchor.style.setProperty('--weapon-opacity', (1 - part(p, .91, .98)).toFixed(4));
    arrival.dataset.phase = String(p < .18 ? 0 : p < .43 ? 1 : p < .89 ? 2 : p < .99 ? 3 : 4);
    arrival.dataset.beat = String(p < .18 ? 0 : p < .43 ? 1 : p < .89 ? 2 : 3);
    label.textContent = stages[p < .18 ? 0 : p < .43 ? 1 : p < .89 ? 2 : p < .99 ? 3 : 4];
    meter.textContent = `${String(Math.round(p * 100)).padStart(3, '0')} / 100`;
    draw(p);
  }
  function tick() {
    raf = 0;
    const diff = target - visual;
    visual += Math.abs(diff) < .0001 ? diff : diff * (reduce ? .46 : .13);
    render(visual);
    if (Math.abs(target - visual) > .0001) raf = requestAnimationFrame(tick);
  }
  addEventListener('resize', () => draw(visual));
  render(0);
})();
