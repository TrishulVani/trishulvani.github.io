(() => {
  if (new URLSearchParams(location.search).get('design') !== '2') return;
  const content = document.querySelector('.main > .content');
  if (!content) return;

  const track = document.createElement('section');
  track.className = 'flyover-v2';
  track.setAttribute('aria-label', 'Scroll-controlled aircraft flyover concept');
  track.innerHTML = `
    <div class="flyover-stage">
      <div class="flyover-texture" aria-hidden="true"></div>
      <div class="flyover-cloud cloud-one" aria-hidden="true"></div>
      <div class="flyover-cloud cloud-two" aria-hidden="true"></div>
      <div class="flyover-radar" aria-hidden="true"></div>
      <svg class="flyover-route" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true"><path d="M-130 790C330 730 700 455 1135 265S1580 12 1660-100"/><circle cx="270" cy="724" r="3"/><circle cx="1135" cy="265" r="3"/></svg>
      <div class="flyover-back" aria-hidden="true"><span>PROJECT / त्रिSHUL VANI</span><strong>LISTEN.</strong><small>BEYOND THE VISIBLE</small></div>
      <div class="flyover-aura" aria-hidden="true"></div>
      <div class="flyover-craft" aria-hidden="true"><img src="/assets/b2-flyover-v2.webp" alt=""></div>
      <div class="flyover-header"><span class="flyover-brand"><img class="v2-brand-glyph" src="/assets/brand-glyph-v2.png" alt="">त्रिSHUL VANI <i>/</i> SOUND INTELLIGENCE</span><span class="flyover-status"><b></b> SCROLL LINK ACTIVE</span></div>
      <i class="flyover-bracket top-left"></i><i class="flyover-bracket top-right"></i><i class="flyover-bracket bottom-left"></i><i class="flyover-bracket bottom-right"></i>
      <div class="flyover-hud"><div><span class="flyover-eyebrow">01 / B-2 SPIRIT VISUAL STUDY</span><h1>Sound moves<br>through every mission.</h1><p>Illustrative flyover. Explore the signal, then put the real processor to work.</p></div><div class="flyover-readout"><strong id="flyover-percent">000%</strong><span id="flyover-direction">SCROLL DOWN TO FLY</span></div></div>
      <div class="flyover-hint">SCROLL TO CONTROL THE FLYOVER</div>
      <div class="flyover-progress" aria-hidden="true"><span></span></div>
    </div>`;
  content.prepend(track);

  const craft = track.querySelector('.flyover-craft');
  const percent = track.querySelector('#flyover-percent');
  const direction = track.querySelector('#flyover-direction');
  const fill = track.querySelector('.flyover-progress span');
  const cloudOne = track.querySelector('.cloud-one');
  const cloudTwo = track.querySelector('.cloud-two');
  const aura = track.querySelector('.flyover-aura');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scheduled = false;
  let last = -1;
  const clamp = n => Math.min(1, Math.max(0, n));
  const smooth = n => n * n * (3 - 2 * n);
  function render() {
    scheduled = false;
    const box = track.getBoundingClientRect();
    const p = clamp(-box.top / Math.max(1, box.height - innerHeight));
    const t = smooth(p);
    const x = -57 + 114 * t;
    const y = 28 - 53 * t;
    const scale = .78 + .27 * Math.sin(Math.PI * t);
    const roll = -10 + 18 * t;
    craft.style.setProperty('--fly-x', `${x.toFixed(3)}vw`);
    craft.style.setProperty('--fly-y', `${y.toFixed(3)}vh`);
    craft.style.setProperty('--fly-scale', scale.toFixed(3));
    craft.style.setProperty('--fly-roll', `${roll.toFixed(2)}deg`);
    if (!reduce) {
      cloudOne.style.transform = `translate3d(${(t * 12).toFixed(1)}%,${(-t * 11).toFixed(1)}%,0)`;
      cloudTwo.style.transform = `translate3d(${(-t * 8).toFixed(1)}%,${(t * 9).toFixed(1)}%,0)`;
    }
    aura.style.opacity = String(.26 + .56 * Math.sin(Math.PI * t));
    fill.style.transform = `scaleX(${p.toFixed(4)})`;
    percent.textContent = `${String(Math.round(p * 100)).padStart(3, '0')}%`;
    direction.textContent = p >= .997 ? 'FLYOVER COMPLETE' : last >= 0 && p < last - .0001 ? 'REWINDING / SCROLL UP' : 'ADVANCING / SCROLL DOWN';
    last = p;
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(render); } }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  render();
})();
