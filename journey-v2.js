(() => {
  if (new URLSearchParams(location.search).get('design') !== '2') return;
  const section = document.querySelector('.v2-journey');
  if (!section) return;
  const phase = section.querySelector('#v2-journey-phase');
  const stage = section.querySelector('.v2-journey-stage');
  const canvas = section.querySelector('.v2-journey-refraction');
  const ctx = canvas.getContext('2d');
  const pointer = { x: .5, y: .48, active: false };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = n => Math.min(1, Math.max(0, n));
  const ease = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
  const segment = (p, start, end) => ease((p - start) / (end - start));
  const range = (a, b, t) => a + (b - a) * t;
  let pending = false;

  function drawRefraction(progress) {
    const width = stage.clientWidth, height = stage.clientHeight, dpr = Math.min(devicePixelRatio || 1, 1.5);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ctx.clearRect(0, 0, width, height);
    const x = pointer.x * width, y = pointer.y * height;
    const colors = ['#d6a55b', '#62bca0', '#9cbdba', '#b77b48'];
    const field = ctx.createLinearGradient(0, height * .18, width, height * .82);
    field.addColorStop(0, '#386e61');
    field.addColorStop(.28, '#c89a61');
    field.addColorStop(.58, '#77b8a1');
    field.addColorStop(.82, '#c0afa2');
    field.addColorStop(1, '#9d673e');
    for (let band = -3; band < 10; band++) {
      ctx.beginPath();
      for (let step = 0; step <= 64; step++) {
        const px = width * step / 64;
        const proximity = Math.exp(-Math.pow((px - x) / (width * .24), 2));
        const py = height * (.12 + band * .115) + Math.sin(px / width * 7.4 + band * .54 + progress * 2.2) * height * .046 + (y - height * .5) * proximity * .18;
        if (step === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = field;
      ctx.globalAlpha = (pointer.active ? .24 : .13) * (1 - Math.abs(band - 3) / 16);
      ctx.lineWidth = band % 3 === 0 ? 2.4 : 1.2;
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const radius = 42 + i * 39 + progress * 105;
      ctx.beginPath();
      ctx.ellipse(x, y, radius * 1.45, radius * .58, -.2 + progress * .23, 0, Math.PI * 2);
      ctx.strokeStyle = colors[i % colors.length];
      ctx.globalAlpha = (pointer.active ? .21 : .08) * (1 - i / 10);
      ctx.lineWidth = i % 3 === 0 ? 1.8 : .9;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    pending = false;
    const rect = section.getBoundingClientRect();
    if (rect.top > innerHeight || rect.bottom < 0) return;
    const p = clamp(-rect.top / Math.max(1, rect.height - section.querySelector('.v2-journey-stage').clientHeight));
    const approach = segment(p, 0, .19);
    const passage = segment(p, .16, .5);
    const breakIn = segment(p, .47, .63);
    const cockpit = segment(p, .62, .82);
    const depart = segment(p, .82, .95);
    const exit = segment(p, .94, 1);
    const set = (name, value) => section.style.setProperty(`--${name}`, typeof value === 'number' ? value.toFixed(4) : value);

    set('progress', p);
    set('space', segment(p, .12, .42));
    set('refraction-opacity', 1 - segment(p, .31, .53));
    set('voxels-opacity', (reduce ? .35 : .7) * (1 - segment(p, .26, .48)));
    set('ribbons-opacity', segment(p, .05, .16) * (1 - segment(p, .47, .62)));
    set('portal', segment(p, .12, .4));
    set('travel', reduce ? 0 : passage);
    set('operator-scale', reduce ? 1 : range(.74, 1.34, approach) * range(1, .52, passage) * range(1, .23, segment(p, .58, .72)));
    set('operator-x', reduce ? 0 : range(0, -25, passage));
    set('operator-y', reduce ? 0 : range(0, -31, passage));
    set('operator-rotate', reduce ? 0 : range(0, -18, passage));
    set('operator-opacity', 1 - segment(p, .24, .34));
    set('passage-opacity', segment(p, .22, .34) * (1 - segment(p, .6, .69)));
    set('passage-zoom', reduce ? 1 : range(1.01, 1.44, passage));
    set('passage-x', reduce ? 0 : range(3, -11, passage));
    set('passage-y', reduce ? 0 : range(1, 4, passage));
    set('traveler-opacity', segment(p, .26, .36) * (1 - segment(p, .6, .69)));
    set('traveler-scale', reduce ? 1 : range(.64, 1.43, segment(p, .29, .63)));
    set('traveler-x', reduce ? 0 : range(13, -14, segment(p, .29, .63)));
    set('traveler-y', reduce ? 0 : range(-8, 13, segment(p, .29, .63)));
    set('traveler-rotate', reduce ? 0 : range(-8, 3, segment(p, .29, .63)));
    set('flight-opacity', segment(p, .61, .69) * (1 - segment(p, .87, .97)));
    set('flight-zoom', reduce ? 1 : range(1.17, 1.46, cockpit) * range(1, .83, depart));
    set('flight-x', reduce ? 0 : range(0, -2.5, cockpit));
    set('flight-y', reduce ? 0 : range(0, 3, cockpit));
    set('departure-opacity', segment(p, .84, .91) * (1 - exit));
    set('departure-scale', reduce ? 1 : range(1.12, .22, depart));
    set('departure-x', reduce ? 0 : range(0, 8, depart));
    set('departure-y', reduce ? 0 : range(0, -26, depart));
    set('break', reduce ? 0 : breakIn);
    set('shock-opacity', reduce ? 0 : segment(p, .49, .55) * (1 - segment(p, .66, .75)));
    set('crack-opacity', reduce ? 0 : segment(p, .47, .52) * (1 - segment(p, .61, .68)));
    set('shards-opacity', reduce ? 0 : segment(p, .52, .58) * (1 - segment(p, .64, .71)));
    set('copy-a', 1 - segment(p, .2, .26));
    set('copy-b', segment(p, .23, .29) * (1 - segment(p, .46, .53)));
    set('copy-c', segment(p, .46, .53) * (1 - segment(p, .64, .68)));
    set('copy-d', segment(p, .66, .7) * (1 - segment(p, .91, .97)));
    set('copy-e', segment(p, .91, .97));
    section.querySelector('.v2-journey-copy-e').inert = p < .94;
    phase.textContent = p < .2 ? '01 / APPROACH' : p < .47 ? '02 / INTERSTELLAR' : p < .66 ? '03 / GLASS BREAK' : p < .88 ? '04 / COCKPIT FLIGHT' : p < .96 ? '05 / FLY-OFF' : '06 / AUDIO LABORATORY';
    drawRefraction(p);
  }

  function schedule() { if (!pending) { pending = true; requestAnimationFrame(render); } }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  stage.addEventListener('pointermove', event => {
    const rect = stage.getBoundingClientRect();
    pointer.x = clamp((event.clientX - rect.left) / rect.width);
    pointer.y = clamp((event.clientY - rect.top) / rect.height);
    pointer.active = true;
    section.style.setProperty('--pointer-shift-x', `${((pointer.x - .5) * 30).toFixed(2)}px`);
    section.style.setProperty('--pointer-shift-y', `${((pointer.y - .5) * 24).toFixed(2)}px`);
    schedule();
  }, { passive: true });
  stage.addEventListener('pointerleave', () => {
    pointer.active = false;
    section.style.setProperty('--pointer-shift-x', '0px');
    section.style.setProperty('--pointer-shift-y', '0px');
    schedule();
  });
  render();
})();
